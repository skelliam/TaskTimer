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
function teaTimerQuickTimer()
{
    this.init=function()
    {
        document.getElementById("teaTimer-qtTime").focus();
        document.getElementById("teaTimer-qtBtnCancel").addEventListener("command",teaTimerQtInstance.cancelButtonCommand,false);
        document.getElementById("teaTimer-qtBtnOk").addEventListener("command",teaTimerQtInstance.okButtonCommand,false);
    }
    
    this.okButtonCommand=function()
    {
        var ok=false;
        var input=document.getElementById("teaTimer-qtTime").value;
	try
	{
            var time=window.opener.teaTimerInstance.validateEnteredTime(input);
            ok=true;
            window.opener.teaTimerInstance.setCountdown(time);
            
            if(document.getElementById("teaTimer-qtChkStartCountdown").checked)
            {
                window.opener.teaTimerInstance.startCountdown();
            }
        }
        catch(e)
        {
            var errorMsg="";
            if(e.name==="teaTimerQuickTimerInputToShortException")
            {
                errorMsg="Your input was to short.";
            }
            else
            {
                errorMsg="Your input was in the wrong format."
            }
		    
            errorMsg+="\nYou should enter the time in seconds (130 for example) or as minute:seconds (2:10 for example).\nPlease try again or hit the cancel button.";
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

function teaTimerQuickTimerInputToShortException(msg)
{
	this.name="teaTimerQuickTimerInputToShortException";
	this.message=((msg===undefined)?null:msg);
}

function teaTimerQuickTimerInvalidInputException(msg)
{
	this.name="teaTimerQuickTimerInvalidInputException";
	this.message=((msg===undefined)?null:msg);
}


var teaTimerQtInstance=new teaTimerQuickTimer();
window.addEventListener("load",teaTimerQtInstance.init,false);