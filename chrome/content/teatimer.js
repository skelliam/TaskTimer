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
	var teatimerCountdown=null;
	var self=this;
	var countdownInterval=null;
	var statusbarAlertInterval=null;
	
	/**
	 * The public init method of teaTimer. 
	 **/
	this.init=function()
	{
		teatimerCountdown=document.getElementById("teatimer-countdown");
		teatimerCountdown.addEventListener("click",teaTimerInstance.startCountdown,false);
		resetCountdown();
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
	this.reloadCountdown=function()
	{
		clearInterval(statusbarAlertInterval);
		teatimerCountdown.removeAttribute("class");
		resetCountdown();
		teatimerCountdown.removeEventListener("click",teaTimerInstance.reloadCountdown,false);
		teatimerCountdown.addEventListener("click",teaTimerInstance.startCountdown,false);
	}
	
	/**
	 * This public method should be called every time, when the countdown 'beats' and does everything, that should be done in every interval cycle
	 **/
	this.pulse=function()
	{
		var currentTime=getCurrentCountdownTime();
		currentTime--;
		//log(currentTime);
		setCountdown(currentTime);
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
		var parts=teatimerCountdown.getAttribute("value").split(":");
		var minutes=parseInt(parts[0]);
		var seconds=parseInt(parts[1]);
		
		return minutes*60+seconds;
	}
	
	
	/**
	 * This private method resets the countdown to the value of the currently choosen tea.
	 **/
	var resetCountdown=function()
	{
		setCountdown(getBrewingTimeOfCurrentTea());
	}
	
	/**
	 * This private method returns the brewing time (in seconds) of the currenlty choosen tea.
	 * @returns integer brewing time in seconds
	 * @2do: This is currently static (set to 60)
	 **/
	var getBrewingTimeOfCurrentTea=function()
	{
		return 5;
	}
	
	/**
	 * This private can be used to set a countdown.
	 * @param integer time in seconds
	 **/
	var setCountdown=function(time)
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
}

/*
function teaTimerExampleException(msg)
{
	this.name="teaTimerExampleException";
	this.message=((msg===undefined)?null:msg);
}
*/
var teaTimerInstance=new teaTimer();
window.addEventListener("load",teaTimerInstance.init,false);
