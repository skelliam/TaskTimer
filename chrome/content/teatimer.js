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
	const thisClassName="teaTimer"; // needed in debug output
	
	const teaDB=new teaTimerTeaDB();
	const common=new teaTimerCommon();
	
	var teatimerCountdown=null; //container for quick timer XUL element reference 'teatimer-countdown' (label)
	var teatimerContextMenu=document.getElementById("teatimer-contextMenu");
	const sound=Components.classes["@mozilla.org/sound;1"].createInstance().QueryInterface(Components.interfaces.nsISound);
	
	var self=this;
	var countdownInterval=null; //container for the countdown interval ressource
	var statusbarAlertInterval=null; //container for the statusbar alert ('blink-blink') interval ressource
	var startingTSofCurrentCountdown=null;
	var steepingTimeOfCurrentTea=null; 
	var countdownInProgress=false; //flag
	var idOfCurrentSteepingTea=null;
	
	/**
	 * The public init method of teaTimer. 
	 **/
	this.init=function()
	{
		teatimerCountdown=document.getElementById("teatimer-countdown");
		teatimerCountdown.addEventListener("click",teaTimerInstance.countdownAreaClicked,false);
		sound.init();
		document.getElementById("teatimer-options").addEventListener("command",teaTimerInstance.openOptionsWindow,false);
		document.getElementById("teatimer-quicktimer").addEventListener("command",teaTimerInstance.quicktimerMenuitemCommand,false);
		document.getElementById("teatimer-cancel").addEventListener("command",teaTimerInstance.cancelTimer,false);
		
		if(teaDB.getNumberOfTeas()===0)
		{
			teaDB.initTeaDB();
		}
		teatimerContextMenu=document.getElementById("teatimer-contextMenu");
		teatimerContextMenu.addEventListener("popupshowing",teaTimerInstance.prepareTeaSelectMenu,false);
		
		resetCountdown();
		//self.openOptionsWindow();
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
		var teas=teaDB.getDataOfAllTeas();

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
			teaNode.setAttribute("label",tea["name"]+" ("+common.getTimeStringFromTime(tea["time"])+")");
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
		if(isNaN(id) || !teaDB.checkTeaWithID(id))
		{
		    throw new teaTimerInvalidTeaIDException("teaChoosen: Invalid tea ID given.");
		}
		
		self.stopCountdown();
		
		teaDB.setTeaChecked(id);
		idOfCurrentSteepingTea=null; //reseting maybe set quicktimer flag
		
		self.setCountdown(teaDB.getTeaData(id)["time"]);
		self.startCountdown();
	}
	
	/**
	 * This method is called, when the quick timer menu item is acivated (clicked).
	 * It opens the quicktimer window.
	 **/
	this.quicktimerMenuitemCommand=function()
	{
		window.openDialog("chrome://teatimer/content/quicktimer.xul","","centerscreen,dialog,modal,resizable,scrollbars,dependent");
	}
	
	/**
	 * This method is called, when the options menu item is acivated (clicked).
	 * It opens the options window.
	 **/
	this.openOptionsWindow=function()
	{
		window.openDialog("chrome://teatimer/content/options.xul","","centerscreen,dialog,modal,resizable,scrollbars,dependent");
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
				//self.stopCountdown();
				//teatimerCountdown.setAttribute("tooltiptext","Timer paused. Click to proceed.");
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
		
		teatimerCountdown.setAttribute("value",common.getTimeStringFromTime(time));
	}
	
	/**
	 * This public method starts the countdown for the currently choosen tea.
	 **/
	this.startCountdown=function()
	{
		cancelStatusbarAlert(); //maybe the statusbar alert ('blink-blink') is still on, so we have to cancel it		
		teatimerCountdown.setAttribute("tooltiptext","Currently steeping...");
		countdownInProgress=true;
		if(idOfCurrentSteepingTea==="quicktimer")
		{
			steepingTimeOfCurrentTea=getCurrentCountdownTime();
		}
		else
		{
			idOfCurrentSteepingTea=teaDB.getIdOfCurrentTea();
			steepingTimeOfCurrentTea=teaDB.getSteepingTimeOfCurrentTea();
		}
		
		startingTSofCurrentCountdown=new Date().getTime();
		
		countdownInterval=window.setInterval(teaTimerInstance.pulse,1000);
		
		var soundID=common.getIdOfStartSound();
		if(soundID!=="none")
		{
			sound.play(common.getURLtoSound("start",soundID,true));
		}
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
		common.log("Main class","statusbartime: "+currentTime+"\n");
		var difference=new Date().getTime()-startingTSofCurrentCountdown;
		common.log("Main class","difference: "+difference+"\n");
		if((difference%1000)>=900 && (difference%1000)<1000)
		{
			difference+=100;
		}
		common.log("Main class","corrected difference: "+difference+"\n");
		common.log("Main class","steeping time of current tea: "+currentTime+"\n");
		currentTime=steepingTimeOfCurrentTea-parseInt(difference/1000);
		common.log("Main class","new statusbartime: "+currentTime+"\n\n");
		self.setCountdown(currentTime);	
		if(currentTime<=0)
		{
			brewingComplete();
		}
		common.log("Main class","-----\n");
	}
	
	/**
	 * This public method stops the current count down.
	 * Please note, that it does no reset of it, so you may call resetCountdown after calling this method.
	 **/
	this.stopCountdown=function()
	{
		window.clearInterval(countdownInterval);
		startingTSofCurrentCountdown=steepingTimeOfCurrentTea=null;
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
		idOfCurrentSteepingTea=startingTSofCurrentCountdown=steepingTimeOfCurrentTea=null;
		teatimerCountdown.removeEventListener("click",teaTimerInstance.countdownAreaClicked,false);
		teatimerCountdown.addEventListener("dblclick",teaTimerInstance.stopCountdown,false); //special treament of double clicks, otherwise the next countdown would be started immediately, because the normal click event will be raised to. We don't want that. That's why we stop the countdown right after that.
		teatimerCountdown.addEventListener("click",teaTimerInstance.reloadCountdown,false);
	}
	
	/**
	 * @returns integer the currentdown time in seconds
	 **/
	var getCurrentCountdownTime=function()
	{
		return common.getTimeFromTimeString(teatimerCountdown.getAttribute("value"));
	}
	
	
	/**
	 * This private method resets the countdown to the value of the currently choosen tea.
	 **/
	var resetCountdown=function()
	{
		teatimerCountdown.setAttribute("tooltiptext","Click here to start tea timer, right click for more options.");
		self.setCountdown(teaDB.getSteepingTimeOfCurrentTea());
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
		doSoundAlert();
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
			teaName=teaDB.getTeaData(idOfCurrentSteepingTea)["name"];
		}
		window.openDialog("chrome://teatimer/content/teaReadyDialog.xul","","centerscreen,dialog,resizable,dependent,minimizable=no",teaName);
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
	
	var doSoundAlert=function()
	{
        var soundID=common.getIdOfEndSound();
		if(soundID!=="none")
		{
			sound.play(common.getURLtoSound("end",soundID,true));
		}
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
}

var teaTimerInstance=new teaTimer();
window.addEventListener("load",teaTimerInstance.init,false);