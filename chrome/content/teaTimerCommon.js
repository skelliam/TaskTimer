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
    const storedPrefs=Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
    const alertPrefs=storedPrefs.getBranch("teatimer.alerts.");
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
		=================
		| Alert methods |
		=================
	*/
	
	/**
	 * This public method checks, if the given alarm is active (should be fired) or not.
	 * @param string alertType ("popup" or "statusbar")
	 * @return bool true or false
	 **/
	this.isAlertDesired=function(type)
	{
		type=(type.toLowerCase()==="popup")?"Popup":"Statusbar";
		
		var desired=false;
        try
        {
            desired=alertPrefs.getBoolPref("do"+type+"Alert");
        }
        catch(e)
        {
			alertPrefs.setBoolPref("do"+type+"Alert",true);
			desired=true;
        }
		
        return desired;
	}
	
	/**
	 * This public method activates or deactivates a certain alert.
	 * @param string alertType ("popup" or "statusbar")
	 * @param bool activate (=true) or deactivate(=false)
	 * @throws teaTimerInvalidAlertStatusException
	 **/
	this.setAlert=function(type,status)
	{
		type=(type.toLowerCase()==="popup")?"Popup":"Statusbar";
		if(typeof status!=="boolean")
		{
			throw new teaTimerInvalidAlertStatusException("setAlert: Second parameter must be boolean.");
		}
		
		alertPrefs.setBoolPref("do"+type+"Alert",status);
	}
	
	/*
	=========================
	| Sound Alert  methods|
	=========================
	
	Note: Sound IDs are not numeric, and there's a special ID called "none" for no sound.
    */
	
	/**
	 * This public methods returns the ID of the sound, that is played, when a timer is started.
	 * @return string soundID
	 **/
	this.getIdOfStartSound=function()
    {
        return getIdOfSound("start");
    }
    
	/**
	 * This public methods returns the ID of the sound, that is played, when a timer is finished.
	 * @return string soundID
	 **/
    this.getIdOfEndSound=function()
    {
        return getIdOfSound("end");
    }
    
	/**
	 * This private mthod return the ID of either the start or the end sound.
	 * @param string type (possible values are: 'start' and 'end')
	 * @return string soundID
	 **/
    var getIdOfSound=function(type)
    {
        var id=null;
        
        try
        {
            id=alertPrefs.getCharPref(type+"Sound");
        }
        catch(e)
        {
            //do nothing;
        }
        
        if(id===null || self.in_array(id,getValidSoundIDs(type))===false)
        {
            id="none";
            alertPrefs.setCharPref(type+"Sound",id);
        }
        
        return id;
    }
    
	/**
	 * This private method returns all valid sound IDs for a certain sound type.
	 * @param string type (possible values are: 'start' and 'end')
	 * @return array
	 **/
    var getValidSoundIDs=function(type)
    {
        var validSounds=new Array();
        
        if(type==="start")
        {
            validSounds.push("none");
            validSounds.push("cup");
            validSounds.push("eggtimer");
            validSounds.push("pour");
        }
        else
        {
            validSounds.push("none");
            validSounds.push("eggtimer");
            validSounds.push("fanfare");
            validSounds.push("slurp");
            validSounds.push("speech");
        }
        
        return validSounds;
    }
    
	/**
	 * This public methods returns the URL to a specific sound file. It can also return an URL object, that implements the nsIURL interface.
	 *
	 * @param string sound type (possible values are "start" and "end")
	 * @param string sound ID
	 * @param boolean return URL as object (=true) or as String (=false), optional (standard=false);
	 * @return object or string, depending on parameter #3
	 * @throws teaTimerInvalidSoundTypeException
	 * @throws teaTimerInvalidSoundIDException
	 **/
	this.getURLtoSound=function(type,id,returnObject)
	{
		switch(type)
		{
			case "end":
			case "start":
				break;
			default:
				throw new teaTimerInvalidSoundTypeException("getURLtoSound: First argument must be 'start' or 'end'.");
		}
		
		if(self.in_array(id,getValidSoundIDs(type))===false)
		{
			throw new teaTimerInvalidSoundIDException("getURLtoSound: Invalid sound ID given.");
		}
		
		if(id==="none")
		{
			throw new teaTimerInvalidSoundIDException("getURLtoSound: Can't provide URL to sound with ID 'none', because it has none. :-)");
		}
		
		returnObject=((returnObject===true)?true:false);
		
		var url="chrome://teatimer/content/sound/";
		if(type==="start")
		{
			switch(id)
			{
				case "cup":
					url+="start-cup.wav";
					break;
				case "eggtimer":
					url+="start-egg-timer.wav";
					break;
				case "pour":
					url+="start-pouring.wav";
					break;
			}
		}
		else
		{
			switch(id)
			{
				case "eggtimer":
					url+="end-egg-timer.wav";
					break;
				case "fanfare":
					url+="end-fanfare.wav";
					break;
				case "slurp":
					url+="end-slurp.wav";
					break;
				case "speech":
					url+="end-speech.wav";
					break;
			}
		}
		
		if(returnObject)
		{
			const SND_URL=new Components.Constructor("@mozilla.org/network/standard-url;1","nsIURL");
			var ret=new SND_URL();
			ret.spec=url;
		}
		else
		{
			var ret=url;
		}
		
		return ret;
	}
	
	/**
	 * This public method checks if the given sound ID is valid.
	 * @param string sound type (possible values are "start" or "end")
	 * @param string soundID
	 * @returns boolean true or false
	 * @throws teaTimerInvalidSoundTypeException
	 **/
	this.checkSoundId=function(type,id)
	{
		switch(type)
		{
			case "end":
			case "start":
				break;
			default:
				throw new teaTimerInvalidSoundTypeException("checkSoundId: First argument must be 'start' or 'end'.");
		}
		
		return self.in_array(id,getValidSoundIDs(type));
	}
	
	/**
	 * This public method sets a specific sound in the options.
	 * @param string sound type (possible values are "start" or "end")
	 * @param string soundID
	 * @throws teaTimerInvalidSoundTypeException
	 * @throws teaTimerInvalidSoundIDException
	 **/
	this.setSound=function(type,id)
	{
		switch(type)
		{
			case "end":
			case "start":
				break;
			default:
				throw new teaTimerInvalidSoundTypeException("setSound: First argument must be 'start' or 'end'.");
		}
		
		if(self.in_array(id,getValidSoundIDs(type))===false)
		{
			throw new teaTimerInvalidSoundIDException("setSound: Invalid sound ID given.");
		}
		
		alertPrefs.setCharPref(type+"Sound",id);
	}
	
	/**
	 * This public method checks if sound alerts are initalized correctly in the stored preferences.
	 * @param string sound type (possible values are "start" or "end")
	 * @returns boolean
	 * @throws teaTimerInvalidSoundTypeException
	 **/
	this.checkIfSoundAlertIsInitalized=function(type)
	{
		switch(type)
		{
			case "end":
			case "start":
				break;
			default:
				throw new teaTimerInvalidSoundTypeException("checkIfSoundAlertIsInitalized: First argument must be 'start' or 'end'.");
		}
		
		var id=null;
		try
		{
		    id=alertPrefs.getCharPref(type+"Sound");
		}
		catch(e)
		{
		    
		}
		
		return ((id!==null && self.checkSoundId(type,id))?true:false);
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

function teaTimerInvalidAlertStatusException(msg)
{
    this.name="teaTimerInvalidAlertStatusException";
    this.message=((msg===undefined)?null:msg);
}

function teaTimerInvalidSoundTypeException(msg)
{
    this.name="teaTimerInvalidSoundTypeException";
    this.message=((msg===undefined)?null:msg);
}

function teaTimerInvalidSoundIDException(msg)
{
	this.name="teaTimerInvalidSoundIDException";
	this.message=((msg===undefined)?null:msg);
}