/*
	TaskTimer: A Firefox extension that protects you from oversteeped task.
	Copyright (C) 2011 Philipp Söhnlein

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
function taskTimerQuickTimer()
{
    const common=new taskTimerCommon();
    
    this.init=function()
    {
        document.getElementById("taskTimer-qtTime").focus();
        document.addEventListener("keypress",taskTimerQtInstance.documentKeypress,false);
		document.getElementById("taskTimer-qtTime").addEventListener("keypress",taskTimerQtInstance.timeKeypress,false);
        document.getElementById("taskTimer-qtBtnCancel").addEventListener("command",taskTimerQtInstance.cancelButtonCommand,false);
        document.getElementById("taskTimer-qtBtnOk").addEventListener("command",taskTimerQtInstance.okButtonCommand,false);
    }
    
    this.documentKeypress=function(event)
    {
        if(event.keyCode===27) //escape
        {
            window.close();
        }
    }
    
    this.timeKeypress=function(event)
    {
	if(event.keyCode===13) //enter
        {
            handleTimeInput();
        }
    }
    
    this.okButtonCommand=function()
    {
        handleTimeInput();
    }
    
    var handleTimeInput=function()
    {
	var ok=false;
        var input=document.getElementById("taskTimer-qtTime").value;
	
	try
	{
            var time=common.validateEnteredTime(input);
            ok=true;
            window.opener.taskTimerInstance.stopCounting();
            window.opener.taskTimerInstance.reloadCountdown();
            window.opener.taskTimerInstance.setCounter(time);
            window.opener.taskTimerInstance.setQuickTimerMode();
			if(document.getElementById("taskTimer-qtChkstartCounting").checked)
            {
                window.opener.taskTimerInstance.startCounting();
            }
            window.opener.taskTimerInstance.setQuickTimerMode();
        }
        catch(e)
        {
            var errorMsg="";
            if(e.name==="taskTimerTimeInputToShortException")
            {
                errorMsg=common.getString("quicktimer.validate.timeInputToShort");
            }
            else
            {
                errorMsg=common.getString("quicktimer.validate.timeInputInWrongFormat");
            }
	      
            errorMsg+="\n"+common.getString("quicktimer.validate.timeInputAdvice");
            alert(errorMsg);
        }
        
	if(ok)
	{
	    window.close();
	}
    }
    
    this.cancelButtonCommand=function()
    {
        window.close();
    }
}




var taskTimerQtInstance=new taskTimerQuickTimer();
window.addEventListener("load",taskTimerQtInstance.init,false);
