/*
	TeaTimer: A Firefox extension that protects you from oversteeped tea.
	Copyright (C) 2008 Philipp Söhnlein

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License version 3 as 
	published by the Free Software Foundation.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


function teaTimerCommon()
{
    var debug=true;
    var self=this;
    const quitObserver=Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
    
    quitObserver.addObserver(this,"quit-application-granted",false);
    
    /**
     * This observer method is called, when the Firefox quits.
     * It checks which teas are marked for deletion and finally deletes them
     **/
    this.observe=function(subject,actionID,actionValue)
    {
	if(actionID==="quit-application-granted")
	{
            try
            {
                var teaDB=new teaTimerTeaDB();
                var hiddenTeas=teaDB.getIDsOfHiddenTeas();
                for(var i=0; i<hiddenTeas.length; i++)
                {
                    try
                    {
                        teaDB.deleteTea(hiddenTeas[i]);
                        self.log("Common","tea with ID "+hiddenTeas[i]+" deleted.\n");
                    }
                    catch(e)
                    {
                        //it's not really a problem, if there was an error, while deleting a tea, because it's still hidden. So, please forgive me, when I'm just swallowing up the error.
                    }
                }
            }
            catch(e)
            {
                //it's not really a problem, if there was an error, while deleting a tea, because it's still hidden. So, please forgive me, when I'm just swallowing up the error.
            }
	    quitObserver.removeObserver(this,"quit-application-granted");
	}
        
        return true;
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
	input=self.trim(input);
	if(input.length<=0)
	{
	    throw new teaTimerTimeInputToShortException("Invalid time input, it's to short.");
	}
	
	var time=null;
	var validFormat1=/^[0-9]+$/; //allow inputs in seconds (example: 60)
	var validFormat2=/^[0-9]+:[0-5][0-9]$/; //allow input in minute:seconds (example: 1:20)
	var validFormat3=/^[0-9]+:[0-9]$/; //allow input in minute:seconds with one digit second (example: 1:9)
	
	if(validFormat1.test(input))
	{
	    time=parseInt(input,10);
	}
	else if(validFormat2.test(input) || validFormat3.test(input))
	{
	    time=self.getTimeFromTimeString(input);
	}
	else
	{
            throw new teaTimerInvalidTimeInputException("Invalid time input.");
	}
	
	if(time<=0)
	{
	    throw new teaTimerInvalidTimeException("Entered Time is smaller or equal 0. That's of course an invalid time.");
	}
	
	return time;
    }
	
    /**
     * This method tries to convert a given string  (like '1:20') into a number of seconds.
     * @param string TimeString (examples: '1:23', '0:40', '12:42')
     * @returns integer seconds
     * @throws teaTimerInvalidTimeStringException
     **/
    this.getTimeFromTimeString=function(str)
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
    this.getTimeStringFromTime=function(time)
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
    this.ltrim=function(text)
    {
	return text.replace(/^\s+/,"");
    }
    
    /**
     * Returns a text without whitespaces at the end.
     * @param string text2rtrim
     * @returns string trimmed text
     **/
    this.rtrim=function(text)
    {
	return text.replace(/\s+$/,"");
    }
    
    /**
     * The famous trim function.
     * @param string text2trim
     * @returns string trimmed text
     **/
    this.trim=function(text)
    {
	return self.ltrim(self.rtrim(text));
    }
    
    
    
    
    /*
	=========================
	| Miscellaneous methods |
	=========================
    */
    
    /**
     * Checks if a value exists in an array
     *
     * This is a javascript reimplentation of the PHP function in_array, including support for arrays as needle.
     *
     * For a full documentation see http://de.php.net/manual/en/function.in-array.php
     *
     * @param mixed needle
     * @param array haystack
     * @param bool strict (optional, standard is false)
     * @throws TypeError
     */
    this.in_array=function(needle,haystack,strict,debug)
    {
	if(!(haystack instanceof Array) || isNaN(haystack.length))
	{
	    throw new TypeError("Warning: in_array(): Wrong datatype for second argument.");
	}
	
	strict=((typeof strict==="boolean")?strict:false);
	
	for(var i=0; i<haystack.length; i++)
	{
	    if(haystack[i] instanceof Array)
	    {
		if(haystack[i].length===needle.length)
		{
		    for(var z=0; z<haystack[i].length; z++)
		    {
			if(
			    (strict===true && needle[z]===haystack[i][z]) ||
                            (strict===false && needle[z]==haystack[i][z])
		    	)
			{
                            if(z===haystack[i].length-1)
                            {
                                return true;
			    }
			}
			else
			{
			    break;
			}
		    }
		}
	    }
	    else
	    {
		if(
			(strict===true && needle===haystack[i]) || 
			(strict===false && needle==haystack[i])
		    )
		    {
			return true;
		    }
	    }
	}
	
	return false;
    }
	
    /**
     * This public method dumps the given string to the console if teaTimer.debug===true and browser dom.window.dump.enabled===true
     * @param string String to dump
     * @returns boolean true
     **/
    this.log=function(component,msgString)
    {
	if(debug)
	{
            component=((typeof component==="string" && component.length>0)?component:"unknown component");
	    dump("teaTimer ("+component+") says: "+msgString);
	}
	
	return true;
    }
}

function teaTimerTimeInputToShortException(msg)
{
    this.name="teaTimerTimeInputToShortException";
    this.message=((msg===undefined)?null:msg);
}

function teaTimerInvalidTimeInputException(msg)
{
    this.name="teaTimerInvalidTimeInputException";
    this.message=((msg===undefined)?null:msg);
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

function teaTimerInvalidTeaNameException(msg)
{
    this.name="teaTimerInvalidTeaNameException";
    this.message=((msg===undefined)?null:msg);
}