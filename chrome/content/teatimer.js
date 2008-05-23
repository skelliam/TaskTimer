/*
	TeaTimer: A Firefox extension that protects you from oversteeped tea.
	Copyright (C) 2008 Philipp Söhnlein

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License version 3 as 
	published by the Free Software Foundation.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

function teaTimer()
{
	var debug=true;
	const thisClassName="teaTimer"; // needed in debug output
	const storedPrefs=Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
	const teaDB=storedPrefs.getBranch("teatimer.teas.");
	const MAXNROFTEAS=42;
	
	var teatimerCountdown=null; //container for quick timer XUL element reference 'teatimer-countdown' (label)
	var quicktimer=null; //container for quick timer XUL element reference 'teatimer-quicktimer' (menuitem)
	var teatimerContextMenu=document.getElementById("teatimer-contextMenu");
	
	var self=this;
	var countdownInterval=null; //container for the countdown interval ressource
	var statusbarAlertInterval=null; //container for the statusbar alert ('blink-blink') interval ressource
	var ts=null; //timestamp
	var countdownInProgress=false; //flag
	var idOfCurrentSteepingTea=null;
	
	/**
	 * The public init method of teaTimer. 
	 **/
	this.init=function()
	{
		teatimerCountdown=document.getElementById("teatimer-countdown");
		teatimerCountdown.addEventListener("click",teaTimerInstance.countdownAreaClicked,false);
		quicktimer=document.getElementById("teatimer-quicktimer");
		quicktimer.addEventListener("command",teaTimerInstance.quicktimerMenuitemCommand,false);
		document.getElementById("teatimer-cancel").addEventListener("command",teaTimerInstance.cancelTimer,false);
		
		if(getNumberOfTeas()===0)
		{
			initTeaDB();
		}
		teatimerContextMenu=document.getElementById("teatimer-contextMenu");
		teatimerContextMenu.addEventListener("popupshowing",teaTimerInstance.prepareTeaSelectMenu,false);
		
		resetCountdown();
	}
	
	/*
		======================
		| 'database' methods |
		======================
	*/
	
	/**
	 * This method generates a basic preconfigured tea database.
	 **/
	var initTeaDB=function()
	{
		log("Initiating Tea Database\n");
		teaDB.setCharPref("1.name","Earl Grey");
		teaDB.setIntPref("1.time",180);
		teaDB.setBoolPref("1.checked",true);
		
		teaDB.setCharPref("2.name","Rooibos");
		teaDB.setIntPref("2.time",420);
		teaDB.setBoolPref("2.checked",false);
		
		teaDB.setCharPref("3.name","White Tea");
		teaDB.setIntPref("3.time",120);
		teaDB.setBoolPref("3.checked",false);
	}
	
	/**
	 * This method counts the number of available teas in the database.
	 * @returns integer number of teas
	 **/
	var getNumberOfTeas=function()
	{
		var teas=0;
		for(var i=1; i<=MAXNROFTEAS; i++) 
		{
			try
			{
				if(checkTeaWithID(i))
				{
					teas++;
				}
			}
			catch(ex)
			{
				//do nothing
			}
		}
		
		return teas;
	}
	
	/**
	 * You can use this method to check if there's a tea with a certain ID.
	 *
	 * @param integer TeaID2check
	 * @returns boolean true or false
	 **/
	var checkTeaWithID=function(id)
	{
		var result=false;
		try
		{
			if(
				teaDB.getCharPref(id+".name").length>0 &&
				teaDB.getIntPref(id+".time")>0 &&
				typeof teaDB.getBoolPref(id+".checked")==="boolean"
				)
			{
				result=true;
			}
		}
		catch(e)
		{
			
		}
		
		return result;
	}
	
	/**
	 * This method queries the database and returns an arary with the ID, the name, the time and the 'choosen state' of a certain tea.
	 *
	 * @param integer ID of tea you want to get data from
	 * @returns array teaData
	 * @throws teaTimerInvalidTeaIDException
	 **/
	var getTeaData=function(id)
	{
		if(checkTeaWithID(id)===false)
		{
			throw new teaTimerInvalidTeaIDException("getTeaData: Invalid ID given.");
		}
		
		var name=teaDB.getCharPref(id+".name");
		var time=teaDB.getIntPref(id+".time");
		var choosen=teaDB.getBoolPref(id+".checked");
		
		return {"ID":id,"name":name,"time":time,"choosen":choosen};
	}
	
	/**
	 * This method can be used to get an array with all teas and the corresponding data.
	 *
	 * Structure of array is:
	 * 	Array(
	 *		1=>Array(ID,name,time,choosen),
	 *		2=>Array(ID,name,time,choosen)
	 *		...
	 * 		)
	 * @returns array
	 **/
	var getDataOfAllTeas=function()
	{
		var teaIDs=getIDsOfTeas();
		var teas=new Array();
		for(var i in teaIDs)
		{
			teas.push(getTeaData(teaIDs[i]));
		}
		
		return teas;
	}
	
	/**
	 * This method returns the ID of the currently choosen/checked tea.
	 * @returns integer teaID
	 **/
	var getIdOfCurrentTea=function()
	{
		var id=1;
		var teaIDs=getIDsOfTeas();
		for(var i in teaIDs)
		{
			var tea=getTeaData(teaIDs[i]);
			if(tea["choosen"]===true)
			{
				id=teaIDs[i];
				break;
			}
		}
		
		return id;
	}
	
	/**
	 * This method returns an array with all available tea IDs.
	 * @returns array teaIDs
	 **/
	var getIDsOfTeas=function()
	{
		var teas=new Array();
		var numberOfTeas=getNumberOfTeas();
		for(var i=1; i<=MAXNROFTEAS; i++)
		{
			if(checkTeaWithID(i))
			{
				teas.push(i);
			}
			
			if(teas.length-1===numberOfTeas)
			{
				break;
			}
		}
		
		return teas;
	}
	
	/**
	 * Use this method to tell the database, that a certain tea is choosen.
	 * The corresponding flag is set in the database for all teas.
	 *
	 * @param integer teaID
	 * @throws teaTimerInvalidTeaIDException
	 **/
	var setTeaChecked=function(id)
	{
		if(checkTeaWithID(id)!==true)
		{
			throw new teaTimerInvalidTeaIDException("setTeaChecked: There's no tea with ID '"+id+"'.");
		}
		
		var teas=getIDsOfTeas();
		for(var i in teas)
		{
			var teaID=teas[i];
			teaDB.setBoolPref(teaID+".checked",((teaID===id)?true:false));
		}
	}
	
	/**
	 * This private method returns the brewing time (in seconds) of the currenlty choosen tea.
	 * @returns integer brewing time in seconds
	 **/
	var getSteepingTimeOfCurrentTea=function()
	{
		return getTeaData(getIdOfCurrentTea())["time"];
	}
	
	
	
	
	/*
		==============
		| UI methods |
		==============
	*/
	
	/**
	 * This public method can be called to regenerate/update the teas in tea timer context menu, based on the current content of the database.
	 * It adds the tea nodes before the separator with XUL ID teatimer-endTealistSeparator
	 **/
	this.prepareTeaSelectMenu=function()
	{
		var teas=getDataOfAllTeas();
		
		var separator=document.getElementById("teatimer-endTealistSeparator");
		while(separator.previousSibling)
		{
			separator.parentNode.removeChild(separator.previousSibling);
		}
		
		for(var i=0; i<teas.length; i++)
		{
			tea=teas[i];
			var teaNode=document.createElement("menuitem");
			teaNode.setAttribute("name","teatimer-tea");
			teaNode.setAttribute("value",tea["ID"]);
			teaNode.setAttribute("label",tea["name"]+" ("+getTimeStringFromTime(tea["time"])+")");
			teaNode.setAttribute("type","radio");
			if(tea["choosen"]===true)
			{
				teaNode.setAttribute("checked","true");
			}
			
			teaNode.addEventListener("command",function(){teaTimerInstance.teaChoosen(parseInt(this.getAttribute("value")));},false); //extract the numeric ID from the menuitem ID which should be something like 'teatimer-tea1"
			
			teatimerContextMenu.insertBefore(teaNode,separator);
		}
	}
	
	/**
	 * This event method is called, when a tea was choosen from the tea context menu.
	 * It stops a maybe running countdown, markes the given tea as checked in the database and starts the new countdon.
	 *
	 * @param integer teaID
	 * @throws teaTimerInvalidTeaIDException
	 **/
	this.teaChoosen=function(id)
	{
		id=parseInt(id);
		if(isNaN(id) || !checkTeaWithID(id))
		{
			throw new teaTimerInvalidTeaIDException("teaChoosen: Invalid tea ID given.");
		}
		
		self.stopCountdown();
		
		setTeaChecked(id);
		
		self.setCountdown(getTeaData(id)["time"]);
		self.startCountdown();
	}
	
	/**
	 * This method is called, when the quick timer menu item is acivated (clicked).
	 * It prompts for an input and 
	 **/
	this.quicktimerMenuitemCommand=function()
	{
		window.openDialog("chrome://teatimer/content/quicktimer.xul","","centerscreen,dialog,modal,resizable,scrollbars,dependent");
	}
	
	/**
	 * This public method is called when the user clicks in the teaTimer statusbar panel.
	 * @param object mouseEvent
	 **/
	this.countdownAreaClicked=function(mouseEvent)
	{
		if(mouseEvent.button===0) //left click
		{
			if(countdownInProgress===true)
			{
				self.stopCountdown();
				teatimerCountdown.setAttribute("tooltiptext","Timer paused. Click to proceed.");
			}
			else
			{
				self.startCountdown();
			}
		}
	}
	
	
	
	
	/*
		=================
		| Timer methods |
		=================
	*/
	
	/**
	 * This public method can be used to set a countdown.
	 * @param integer time in seconds
	 **/
	this.setCountdown=function(time)
	{
		time=parseInt(time);
		if(isNaN(time))
		{
			throw new teaTimerInvalidTimeException("setCountdown: Invalid call. First parameter must be an integer.");
		}
		
		teatimerCountdown.setAttribute("value",getTimeStringFromTime(time));
	}
	
	/**
	 * This public method starts the countdown for the currently choosen tea.
	 **/
	this.startCountdown=function()
	{
		cancelStatusbarAlert(); //maybe the statusbar alert ('blink-blink') is still on, so we have to cancel it		
		teatimerCountdown.setAttribute("tooltiptext","Currently steeping... Click to pause the countdown.");
		countdownInProgress=true;
		idOfCurrentSteepingTea=getIdOfCurrentTea();
		countdownInterval=window.setInterval(teaTimerInstance.pulse,1000);
	}
	
	/**
	 * Use this public mehtod to cancel a currently running timer.
	 **/
	this.cancelTimer=function()
	{
		if(countdownInProgress)
		{
			self.stopCountdown();
		}
		
		cancelStatusbarAlert(); //maybe the statusbar alert ('blink-blink') is still on, so we have to cancel it		
		
		resetCountdown();
	}
	
	/**
	 * This public method sets the quick timer mode to on and must be called when a quick timer countdown was called.
	 **/
	this.setQuickTimerMode=function()
	{
		idOfCurrentSteepingTea="quicktimer";
	}
	
	/**
	 * This public method reloads the countdown in the statusbar.
	 * Included is a complete re-establishment of all events and styles of the countdownArea.
	 *
	 * @param boolean resetCountdown time, too?
	 **/
	this.reloadCountdown=function(reset)
	{
		reset=(reset===false)?false:true;
		cancelStatusbarAlert(); //maybe the statusbar alert ('blink-blink') is still on, so we have to cancel it
		if(reset)
		{
			resetCountdown();
		}
		teatimerCountdown.removeEventListener("click",teaTimerInstance.reloadCountdown,false);
		teatimerCountdown.addEventListener("click",teaTimerInstance.countdownAreaClicked,false);
	}
	
	/**
	 * This public method should be called every time, when the countdown 'beats' and does everything, that should be done in every interval cycle
	 **/
	this.pulse=function()
	{
		var currentTime=getCurrentCountdownTime();
		//log("statusbartime: "+currentTime+"\n");
		var d=new Date();
		if(ts===null)
		{
			ts=d.getTime();
			currentTime--;
		}
		else
		{
			var time=d.getTime();
			var difference=time-ts;
			if(difference>900 && difference<=1000)
			{
				difference+=100;
			}
			//log("difference: "+difference+"\n");
			if(difference>1000)
			{
				currentTime-=parseInt(difference/1000);
				ts=time;
			}
			//log("new statusbartime: "+currentTime+"\n");
		}
		//log("-----\n");
		//log(currentTime);
		self.setCountdown(currentTime);
		if(currentTime<=0)
		{
			brewingComplete();
		}
	}
	
	/**
	 * This public method stops the current count down.
	 * Please note, that it does no reset of it, so you may call resetCountdown after calling this method.
	 **/
	this.stopCountdown=function()
	{
		window.clearInterval(countdownInterval);
		ts=null;
		countdownInProgress=false;
		teatimerCountdown.addEventListener("click",teaTimerInstance.countdownAreaClicked,false);
	}
	
	/**
	 * This method is called, when the countdown is done.
	 * It stops the countdown, raises the alerts and handles events for the countdown area.
	 **/
	var brewingComplete=function()
	{
		self.stopCountdown();
		shootAlerts();
		idOfCurrentSteepingTea=null;
		teatimerCountdown.removeEventListener("click",teaTimerInstance.countdownAreaClicked,false);
		teatimerCountdown.addEventListener("dblclick",teaTimerInstance.stopCountdown,false); //special treament of double clicks, otherwise the next countdown would be started immediately, because the normal click event will be raised to. We don't want that. That's why we stop the countdown right after that.
		teatimerCountdown.addEventListener("click",teaTimerInstance.reloadCountdown,false);
	}
	
	/**
	 * @returns integer the currentdown time in seconds
	 **/
	var getCurrentCountdownTime=function()
	{
		return getTimeFromTimeString(teatimerCountdown.getAttribute("value"));
	}
	
	
	/**
	 * This private method resets the countdown to the value of the currently choosen tea.
	 **/
	var resetCountdown=function()
	{
		teatimerCountdown.setAttribute("tooltiptext","Click here to start tea timer, right click for more options.");
		self.setCountdown(getSteepingTimeOfCurrentTea());
	}
	
	
	
	
	
	/*
		=================
		| Alert methods |
		=================
	*/
	
	
	/**
	 * This method fires all alerts.
	 **/
	var shootAlerts=function()
	{
		doStatusbarAlert();
		doPopupAlert();
	}
	
	/**
	 * This method generates and fires the 'tea-ready'-popup.
	 **/
	var doPopupAlert=function()
	{
		var teaName=null;
		if(idOfCurrentSteepingTea==="quicktimer")
		{
			teaName="... whatever you timed";
		}
		else
		{
			teaName=getTeaData(idOfCurrentSteepingTea)["name"];
		}
		alert("TeaTimer says:\n\tSteeping complete.\n\tEnjoy your "+teaName+". :-)");
	}
	
	/**
	 * This method generates and fires the 'tea-ready'-statusbar-alert.
	 **/
	var doStatusbarAlert=function()
	{
		teatimerCountdown.setAttribute("value","Ready!");
		teatimerCountdown.setAttribute("class","readyAlert");
		teatimerCountdown.setAttribute("tooltiptext","Tea ready. Click here to cancel alert.")
		statusbarAlertInterval=window.setInterval(teaTimerInstance.toggleStatusbarAlertStyle,400);
	}
	
	/**
	 * This method is capable for toggling the correct CSS classes for the 'blinking'-statusbar-alert.
	 **/
	this.toggleStatusbarAlertStyle=function()
	{
		if(teatimerCountdown.getAttribute("class").indexOf("invisible")>0)
		{
			teatimerCountdown.setAttribute("class","readyAlert");
		}
		else
		{
			teatimerCountdown.setAttribute("class","readyAlert invisible");
		}
	}
	
	/**
	 * This method quits the statusbar alert.
	 **/
	var cancelStatusbarAlert=function()
	{
		window.clearInterval(statusbarAlertInterval);
		teatimerCountdown.removeAttribute("class");
	}
	
	
	
	
	
	/*
		=========================
		| string helper methods |
		=========================
	*/
	
	/**
	 * This public method can be used to check if a entered time is in a valid format.
	 *
	 * @param string the potential time
	 * @return integer the validated time in seconds
	 * @throws teaTimerQuickTimerInvalidInputException
	 * @throws teaTimerInvalidTimeException
	 **/
	this.validateEnteredTime=function(input)
	{
		input=trim(input);
		if(input.length<=0)
		{
			throw new teaTimerQuickTimerInputToShortException("Invalid quick timer input. Input is to short.");
		}
		
		var time=null;
		var validFormat1=/^[0-9]+$/; //allow inputs in seconds (example: 60)
		var validFormat2=/^[0-9]+:[0-5][0-9]$/; //allow input in minute:seconds (example: 1:20)
		var validFormat3=/^[0-9]+:[0-9]$/; //allow input in minute:seconds with one digit second (example: 1:9)
		
		if(validFormat1.test(input))
		{
			time=parseInt(input);
		}
		else if(validFormat2.test(input) || validFormat3.test(input))
		{
			time=getTimeFromTimeString(input);
		}
		else
		{
			throw new teaTimerQuickTimerInvalidInputException("Invalid quick timer input.");
		}
		
		if(time<=0)
		{
			throw new teaTimerInvalidTimeException("Entered QuickTimer Time is smaller or equal 0. That's of course an invalid time.");
		}
		
		return time;
	}
	
	/**
	 * This method tries to convert a given string  (like '1:20') into a number of seconds.
	 * @param string TimeString (examples: '1:23', '0:40', '12:42')
	 * @returns integer seconds
	 * @throws teaTimerInvalidTimeStringException
	 **/
	var getTimeFromTimeString=function(str)
	{
		var parts=str.split(":");
		if(parts.length!==2)
		{
			throw new teaTimerInvalidTimeStringException("getTimeFromTimeString: '"+str+"' is not a valid time string.");
		}
		
		var minutes=parseInt(parts[0],10);
		var seconds=parseInt(parts[1],10);
		
		return minutes*60+seconds;
	}
	
	/**
	 * This method returns the string representation (like '1:20') of a given time.
	 * It's the opposite of getTimeFromTimeString
	 *
	 * @param integer time in seconds
	 * @returins string timeString
	 **/
	var getTimeStringFromTime=function(time)
	{
		var timeStr="";
		var seconds=(time%60);
		timeStr=parseInt(time/60)+":"+((seconds<10)?"0":"")+seconds;
		return timeStr;
	}
	
	/**
	 * Returns a text without whitespaces in front.
	 * @param string text2ltrim
	 * @returns string trimmed text
	 **/
	var ltrim=function(text)
	{
		return text.replace(/^\s+/,"");
	}
	
	/**
	 * Returns a text without whitespaces at the end.
	 * @param string text2rtrim
	 * @returns string trimmed text
	 **/
	var rtrim=function(text)
	{
		return text.replace(/\s+$/,"");
	}
	
	/**
	 * The famous trim function.
	 * @param string text2trim
	 * @returns string trimmed text
	 **/
	var trim=function(text)
	{
		return ltrim(rtrim(text));
	}
	
	
	
	/*
		=========================
		| Miscellaneous methods |
		=========================
	*/
	
	/**
	 * This private method dumps the given string to the console if teaTimer.debug===true and browser dom.window.dump.enabled===true
	 * @param string String to dump
	 * @returns boolean true
	 **/
	var log=function(msgString)
	{
		if(debug)
		{
			dump(thisClassName+" says: "+msgString);
		}
		
		return true;
	}
}

function teaTimerInvalidTimeException(msg)
{
	this.name="teaTimerInvalidTimeException";
	this.message=((msg===undefined)?null:msg);
}

function teaTimerInvalidTimeStringException(msg)
{
	this.name="teaTimerInvalidTimeStringException";
	this.message=((msg===undefined)?null:msg);
}

function teaTimerInvalidTeaIDException(msg)
{
	this.name="teaTimerInvalidTeaIDException";
	this.message=((msg===undefined)?null:msg);
}


var teaTimerInstance=new teaTimer();
window.addEventListener("load",teaTimerInstance.init,false);