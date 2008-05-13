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
		//window.setInterval(teaTimerInstance.pulse,1000);
		//window.setTimeout(teaTimerInstance.pulse,1000);
	}
	
	this.pulse=function()
	{
		var currentTime=getCurrentCountdownTime();
		currentTime--;
		log(currentTime);
		setCountdown(currentTime);
	}
	
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
		return 60;
	}
	
	/**
	 * This private can be used to set a countdown.
	 * @param integer time in seconds
	 **/
	var setCountdown=function(time)
	{
		var timeStr="";
		var seconds=(60%time);
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
