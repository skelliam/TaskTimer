/*
	TeaTimer: 
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
	
	var teatimerCountdown=null; //container for quick timer XUL element reference 'teatimer-countdown' (label)
	var quicktimer=null; //container for quick timer XUL element reference 'teatimer-quicktimer' (menuitem)
	
	var self=this;
	var countdownInterval=null;
	var statusbarAlertInterval=null;
	
	/**
	 * The public init method of teaTimer. 
	 **/
	this.init=function()
	{
		teatimerCountdown=document.getElementById("teatimer-countdown");
		teatimerCountdown.addEventListener("click",teaTimerInstance.countdownAreaClicked,false);
		quicktimer=document.getElementById("teatimer-quicktimer");
		quicktimer.addEventListener("command",teaTimerInstance.quicktimerMenuitemCommand,false);
		resetCountdown();
	}
	
	/**
	 * This method is called, when the quick timer menu item is acivated (clicked).
	 * It prompts for an input and 
	 **/
	this.quicktimerMenuitemCommand=function()
	{
		window.openDialog("chrome://teatimer/content/quicktimer.xul","","centerscreen,dialog,modal,resizable,scrollbars,dependent");
	}
	
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
	
	this.countdownAreaClicked=function(mouseEvent)
	{
		if(mouseEvent.button===0) //left click
		{
			self.startCountdown();
		}
	}
	
	/**
	 * This public method starts the countdown for the currently choosen tea.
	 **/
	this.startCountdown=function()
	{
		countdownInterval=window.setInterval(teaTimerInstance.pulse,1000);
		//window.setTimeout(teaTimerInstance.pulse,1000);
	}
	
	/**
	 * This public method reloads the countdown in the statusbar.
	 **/
	this.reloadCountdown=function(reset)
	{
		reset===(reset===true)?true:false;
		clearInterval(statusbarAlertInterval);
		teatimerCountdown.removeAttribute("class");
		if(reset) // go on here
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
		currentTime--;
		//log(currentTime);
		self.setCountdown(currentTime);
		if(currentTime<=0)
		{
			brewingComplete();
		}
	}
	
	/**
	 * This method is called, when the countdown is done. 
	 **/
	var brewingComplete=function()
	{
		clearInterval(countdownInterval);
		shootAlerts();
		teatimerCountdown.removeEventListener("click",teaTimerInstance.startCountdown,false);
		teatimerCountdown.addEventListener("click",teaTimerInstance.reloadCountdown,false);
	}
	
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
		alert("TeaTimer says:\n\tBrewing complete.\n\tEnjoy your tea. :-)");
	}
	
	/**
	 * This method generates and fires the 'tea-ready'-statusbar-alert.
	 **/
	var doStatusbarAlert=function()
	{
		teatimerCountdown.setAttribute("value","Ready!");
		teatimerCountdown.setAttribute("class","readyAlert");
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
		self.setCountdown(getBrewingTimeOfCurrentTea());
	}
	
	/**
	 * This private method returns the brewing time (in seconds) of the currenlty choosen tea.
	 * @returns integer brewing time in seconds
	 * @2do: This is currently static (set to 60)
	 **/
	var getBrewingTimeOfCurrentTea=function()
	{
		return 10;
	}
	
	/**
	 * This public method can be used to set a countdown.
	 * @param integer time in seconds
	 **/
	this.setCountdown=function(time)
	{
		var timeStr="";
		var seconds=(time%60);
		timeStr=parseInt(time/60)+":"+((seconds<10)?"0":"")+seconds;
		teatimerCountdown.setAttribute("value",timeStr);
	}
	
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
	
	/*
		=========================
		| string helper methods |
		=========================
	*/
	
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

var teaTimerInstance=new teaTimer();
window.addEventListener("load",teaTimerInstance.init,false);
