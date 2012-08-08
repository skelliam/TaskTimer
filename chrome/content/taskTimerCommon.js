/*
	TaskTimer: A Firefox extension that protects you from oversteeped task.
	Copyright (C) 2011 Philipp Söhnlein

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


function taskTimerCommon()
{
    var debug=true;
    var self=this;
    const storedPrefs=Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
    const taskTimerPrefs=storedPrefs.getBranch("extensions.tasktimer.");
    const alertPrefs=storedPrefs.getBranch("extensions.tasktimer.alerts.");
    const reportingPrefs=storedPrefs.getBranch("extensions.tasktimer.reporting.");
    const strings=Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService).createBundle("chrome://tasktimer/locale/tasktimer.properties");
    const quitObserver=Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
    quitObserver.addObserver(this,"quit-application-granted",false);

    /**
     * This observer method is called, when the Firefox quits.
     * It checks which tasks are marked for deletion and finally deletes them
     **/
    this.observe=function(subject,actionID,actionValue)
    {
		if(actionID==="quit-application-granted")
		{
            try
            {
                var taskDB=new taskTimerTaskDB();
                var hiddenTasks=taskDB.getIDsOfHiddenTasks();
                for(var i=0; i<hiddenTasks.length; i++)
                {
                    try
                    {
                        taskDB.deleteTask(hiddenTasks[i]);
                        self.log("Common","task with ID "+hiddenTasks[i]+" deleted.\n");
                    }
                    catch(e)
                    {
                        //it's not really a problem, if there was an error, while deleting a task, because it's still hidden. So, please forgive me, when I'm just swallowing up the error.
                    }
                }
            }
            catch(e)
            {
                //it's not really a problem, if there was an error, while deleting a task, because it's still hidden. So, please forgive me, when I'm just swallowing up the error.
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
	 * @param string alertType ("popup", "statusbar" or "widget")
	 * @throws taskTimerInvalidAlertTypeException
	 * @return bool true or false
	 **/
	this.isAlertDesired=function(type)
	{
		switch(type.toLowerCase())
		{
			case "popup":
				type="Popup";
				break;
			case "statusbar":
				type="Statusbar";
				break;
			case "widget":
				type="Widget";
				break;
			default:
				throw new taskTimerInvalidAlertTypeException("isAlertDesired: First parameter must be a vaild alert type.");
		}

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
	 * @param string alertType ("popup", "statusbar" or "widget")
	 * @param bool activate (=true) or deactivate(=false)
	 * @throws taskTimerInvalidAlertTypeException
	 * @throws taskTimerInvalidAlertStatusException
	 **/
	this.setAlert=function(type,status)
	{
		switch(type.toLowerCase())
		{
			case "popup":
				type="Popup";
				break;
			case "statusbar":
				type="Statusbar";
				break;
			case "widget":
				type="Widget";
				break;
			default:
				throw new taskTimerInvalidAlertTypeException("setAlert: First parameter must be a vaild alert type.");
		}

		if(typeof status!=="boolean")
		{
			throw new taskTimerInvalidAlertStatusException("setAlert: Second parameter must be boolean.");
		}

		alertPrefs.setBoolPref("do"+type+"Alert",status);
	}

	/*
		=====================
		| View mode methods |
		=====================
	*/

	/**
	 * This public method returns the current view mode identifier ("iconOnly" or "timeAndIcon")
	 *
	 * @returns string view mode
	 **/
	this.getViewMode=function()
	{
		return getOption("viewMode");
	}

	/**
	 * This public method can be used to set the view mode.
	 *
	 * @param string view mode (currently "iconOnly" or "timeAndIcon" are valid)
	 **/
	this.setViewMode=function(mode)
	{
		setOption("viewMode",mode);
	}

	/**
	 * This public method can be used to check, if the given string is a valid view mode identifier.
	 *
	 * @param string suspected view mode identifier
	 * @returns boolean true or false
	 **/
	this.validateViewMode=function(mode)
	{
		return validateOption("viewMode",mode);
	}

	/*
		=======================
		| Task Sorting methods |
		=======================
	*/

	/**
	 * This public method returns the current task sorting identifier ("id", "name ASC", "name DESC", "time ASC" or "time DESC")
	 *
	 * @returns string task sorting
	 **/
	this.getSortingOrder=function()
	{
		return getOption("sortingOrder");
	}

	/**
	 * This public method can be used to set the new task sorting mode.
	 *
	 * @param string view mode (currently "id", "name ASC", "name DESC", "time ASC" or "time DESC" are valid)
	 **/
	this.setSortingOrder=function(sorting)
	{
		setOption("sortingOrder",sorting);

	}

	/**
	 * This public method can be used to check, if the given string is a valid task sorting identifier.
	 *
	 * @param string suspected task sorting identifier
	 * @returns boolean true or false
	 **/
	this.validateSortingOrder=function(sorting)
	{
		validateOptionValue("sortingOrder",sorting);
	}

	/*
		==================
		| Option methods |
		==================
	*/

	/**
	 * This private method is used, to read options.
	 *
	 * @param name of option (valid values are "sortingOrder" or "viewMode")
	 **/
	var getOption=function(name)
	{
		validateOptionName(name);
		var value=null;
		switch(name) //setting standard value
		{
			case "sortingOrder":
				value="id";
				break;
			case "viewMode":
				value="timeAndIcon";
				break;
		}

		var type=getTypeOfOption(name);

		try
		{
			value=(type==="char")?taskTimerPrefs.getCharPref(name):taskTimerPrefs.getBoolPref(name);
			validateOptionValue(name,value);
		}
		catch(e)
		{
			setOption(name,value);
		}

		return value;
	}

	/**
	 * Use this private method to submit an option name and get back the datatype of it.
	 * @param string optionname
	 * @returns string type ("char" or "bool" or null)
	 **/
	var getTypeOfOption=function(name)
	{
		validateOptionName(name);
		var type=null;
		switch(name)
		{
			case "sortingOrder":
			case "viewMode":
				type="char";
				break;
		}

		return type;
	}

	/**
	 * This private method can be used, to set general task timer options (Noote that alerts and tasks are manipulated with dedicated methods, not with this one.).
	 *
	 * @param string option name
	 * @param string option value
	 **/
	var setOption=function(name,value)
	{
		validateOptionName(name);
		validateOptionValue(name,value);
		var type=getTypeOfOption(name);
		if(type==="char")
		{
			taskTimerPrefs.setCharPref(name,value);
		}
		else
		{
			taskTimerPrefs.setBoolPref(name,value);
		}
	}

	/**
	 * Internal private method for validating given option names.
	 *
	 * @param string suspected option name
	 * @returns boolean true (if first parameter was either "sortingOrder" or "viewMode")
	 * @throws taskTimerInvalidOptionNameException
	 **/
	var validateOptionName=function(name)
	{
		switch(name)
		{
			case "sortingOrder":
			case "viewMode":
				break;
			default:
				throw new taskTimerInvalidOptionNameException("validateOptionName: '"+name+"' is no valid option.");
		}

		return true;
	}

	/**
	 * Internal private method for validating given option values.
	 *
	 * @param string name of option that should have the given value
	 * @param string value2check
	 * @returns boolean true
	 * @throws taskTimerInvalidSortOrderException
	 * @throws taskTimerInvalidViewModeException
	 **/
	var validateOptionValue=function(group,value)
	{
		validateOptionName(group);
		switch(group)
		{
			case "sortingOrder":
				switch(value)
				{
					case "id":
					case "name ASC":
					case "name DESC":
					case "time ASC":
					case "time DESC":
						break;
					default:
						throw new taskTimerInvalidSortOrderException("validateOptionValue(sortingOrder): '"+value+"' is no valid sort order.");
				}
				break;
			case "viewMode":
				switch(value)
				{
					case "timeAndIcon":
					case "iconOnly":
						break;
					default:
						throw new taskTimerInvalidViewModeException("validateOptionValue(viewMode): '"+value+"' is no valid view mode.");
				}
				break;
		}

		return true;
	}

	/*
		========================
		| Widget Alert methods |
		========================
	*/

	/**
	 * This public method can be used to write the widget alert show time (=time until fade out is started) into the stored preferences.
	 * @param integer time
	 * @throws taskTimerInvalidWidgetAlertShowTimeException
	 **/
	this.setWidgetAlertShowTime=function(time)
	{
		if(!(typeof time==="number" && time>=0))
		{
			throw new taskTimerInvalidWidgetAlertShowTimeException("setWidgetAlertShowTime: First parameter must be an integer greater or equal 0.");
		}

		time=parseInt(time,10);
		alertPrefs.setIntPref("widgetAlertShowTime",time);
	}

	/**
	 * This public method can be used to query the time when the website widget should fade out.
	 * @returns integer time in seconds (standard=5)
	 * @throws taskTimerInvalidWidgetAlertShowTimeException
	 **/
	this.getWidgetAlertShowTime=function()
	{
		var time=5;
		try
		{
			time=alertPrefs.getIntPref("widgetAlertShowTime");
			if(time<0)
			{
				throw new taskTimerInvalidWidgetAlertShowTimeException();
			}
		}
		catch(e)
		{
			self.setWidgetAlertShowTime(time);
		}

		return time;
	}

	/*
		=========================
		| Sound Alert  methods |
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

        if(id===null || (id.match(/^custom\:/)===null && false===self.in_array(id,getValidSoundIDs(type)))  )
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
	 * @throws taskTimerInvalidSoundTypeException
	 * @throws taskTimerInvalidSoundIDException
	 **/
	this.getURLtoSound=function(type,id,returnObject)
	{
		switch(type)
		{
			case "end":
			case "start":
				break;
			default:
				throw new taskTimerInvalidSoundTypeException("getURLtoSound: First argument must be 'start' or 'end'.");
		}

		if(id.match(/^custom\: /)===null && self.in_array(id,getValidSoundIDs(type))===false)
		{
			throw new taskTimerInvalidSoundIDException("getURLtoSound: Invalid sound ID given.");
		}

		if(id==="none")
		{
			throw new taskTimerInvalidSoundIDException("getURLtoSound: Can't provide URL to sound with ID 'none', because it has none. :-)");
		}

		returnObject=((returnObject===true)?true:false);

		var url="chrome://tasktimer/content/sound/";
		if(type==="start")
		{
			if(id.match(/^custom\: /)) {
				url='file://'+id.substr(8);
			}
			else {
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
		}
		else
		{
			if(id.match(/^custom\: /)) {
				url='file://'+id.substr(8);
			}
			else {
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
		}

		if(returnObject)
		{
			var ret= Components.classes["@mozilla.org/network/io-service;1"]
                      .getService(Components.interfaces.nsIIOService)
                      .newURI(url, null, null);

			//const SND_URL=new Components.Constructor("@mozilla.org/network/standard-url;1","nsIURL");
			//var ret=new SND_URL();
			//ret.spec=url;
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
	 * @throws taskTimerInvalidSoundTypeException
	 **/
	this.checkSoundId=function(type,id)
	{
		switch(type)
		{
			case "end":
			case "start":
				break;
			default:
				throw new taskTimerInvalidSoundTypeException("checkSoundId: First argument must be 'start' or 'end'.");
		}

		return typeof id.match(/^custom\: /)==="object" || self.in_array(id,getValidSoundIDs(type));
	}

	/**
	 * This public method sets a specific sound in the options.
	 * @param string sound type (possible values are "start" or "end")
	 * @param string soundID
	 * @throws taskTimerInvalidSoundTypeException
	 * @throws taskTimerInvalidSoundIDException
	 **/
	this.setSound=function(type,id)
	{
		switch(type)
		{
			case "end":
			case "start":
				break;
			default:
				throw new taskTimerInvalidSoundTypeException("setSound: First argument must be 'start' or 'end'.");
		}

		if(id.match(/^custom\: /)===null && self.in_array(id,getValidSoundIDs(type))===false)
		{
			throw new taskTimerInvalidSoundIDException("setSound: Invalid sound ID given.");
		}

		alertPrefs.setCharPref(type+"Sound",id);
	}

	/**
	 * This public method checks if sound alerts are initalized correctly in the stored preferences.
	 * @param string sound type (possible values are "start" or "end")
	 * @returns boolean
	 * @throws taskTimerInvalidSoundTypeException
	 **/
	this.checkIfSoundAlertIsInitalized=function(type)
	{
		switch(type)
		{
			case "end":
			case "start":
				break;
			default:
				throw new taskTimerInvalidSoundTypeException("checkIfSoundAlertIsInitalized: First argument must be 'start' or 'end'.");
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
     * @throws taskTimerQuickTimerInvalidInputException
     * @throws taskTimerInvalidTimeException
     **/
    this.validateEnteredTime=function(input)
    {
		input=self.trim(input);
		if(input.length<=0)
		{
			throw new taskTimerTimeInputToShortException("Invalid time input, it's to short.");
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
			throw new taskTimerInvalidTimeInputException("Invalid time input.");
		}

		if(time<=0)
		{
			throw new taskTimerInvalidTimeException("Entered Time is smaller or equal 0. That's of course an invalid time.");
		}

		return time;
    }

    /**
     * This method tries to convert a given string  (like '1:20') into a number of seconds.
     * @param string TimeString (examples: '1:23', '0:40', '12:42')
     * @returns integer seconds
     * @throws taskTimerInvalidTimeStringException
     **/
    this.getTimeFromTimeString=function(str)
    {
		var parts=str.split(":");
		if(parts.length==2)
		{
         var hours = 0;
         var minutes=parseInt(parts[0]);
         var seconds=parseInt(parts[1]);
		}
      else if (parts.length==3)
      {
         var hours=parseInt(parts[0]);
         var minutes=parseInt(parts[1]);
         var seconds=parseInt(parts[2]);
      }
		return (hours*60*60)+(minutes*60)+seconds;
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
		var seconds=(time)%60;      //seconds left after removing minutes
      var minutes=(time/60)%60;   //minutes left after removing hours
      var hours=(time/60/60);     //hours
      var timeStr=sprintf("%2d:%02d:%02d", parseInt(hours), parseInt(minutes), parseInt(seconds)); 
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

    /**
     * This public method returns the localized string (property) with the specified ID.
     * A list of names/values can be found in locale folder (tasktimer.properties)
     * In fact this method is just a wrapper for GetStringFromName of the stringbundle XPC
     *
     * @param string name
     * @returns string the localized string.
     **/
    this.getString=function(name)
    {
        return strings.GetStringFromName(name);
    }

    /**
     * This public method returns the localized string (property) with the specified ID, but in difference to getString this method is for formatted strings (strings with variables).
     * A list of names/values can be found in locale folder (tasktimer.properties)
     * In fact this method is just a wrapper for formatStringFromName of the stringbundle XPC
     *
     * @param string name
     * @param array values for placeholders as array (NOTE: this array must be a real array. Objects, like {0:"foo"} are not working.)
     * @returns string the localized string.
     **/
    this.getStringf=function(name,params)
    {
        return strings.formatStringFromName(name,params,params.length);
    }



    /*
		=========================
		| Miscellaneous methods |
		=========================
    */

	this.basename=function(path) {
		var parts=path.split("/"); //@2do Check if this works on Windows, too!
		return parts[ parts.length-1 ];
	}

	/**
	 * This public method can be used to add a CSS class to a specific DOM element.
	 * @param object the DOM element
	 * @param string the class that should be added.
	 **/
	this.addCSSClass=function(object,className)
	{
		var oldClassStr=object.getAttribute("class");
		var newClassStr="";
		if(oldClassStr.length>0)
		{
			var classes=oldClassStr.split(" ");
			if(!self.in_array(className,classes))
			{
				newClassStr=oldClassStr+" "+className;
			}
			else
			{
				newClassStr=oldClassStr;
			}
		}
		else
		{
			newClassStr=className;
		}

		object.setAttribute("class",newClassStr);
	}

	/**
	 * This public method removes a certain CSS class from a specific DOM element.
	 * If there's no class left the class attribute will be removed from the object.
	 *
	 * @param object the DOM element
	 * @param string the class that should be removed
	 **/
    this.removeCSSClass=function(object,className)
	{
		var oldClassStr=object.getAttribute("class");
		var classes=oldClassStr.split(" ");
		var newClassStr="";
		for(var i=0; i<classes.length; i++)
		{
			if(classes[i]!==className)
			{
				newClassStr+=classes[i]+" ";
			}
		}
		newClassStr=self.trim(newClassStr);
		if(newClassStr.length>0)
		{
			object.setAttribute("class",newClassStr);
		}
		else
		{
			object.removeAttribute("class");
		}
	}

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

    this.getReportingPrefs=function()
    {
       var prefs = new Array();
       prefs.showAccumulatedTime = reportingPrefs.getBoolPref("showAccumulatedTime");
       prefs.showAccumulatedTimeSince = reportingPrefs.getCharPref("showAccumulatedTimeSince");
       return prefs;
    }

    this.setReportingPrefs=function(prefs)
    {
       reportingPrefs.setBoolPref("showAccumulatedTime", prefs.showAccumulatedTime ? "true" : "false");
       reportingPrefs.setCharPref("showAccumulatedTimeSince", prefs.showAccumulatedTimeSince);
    }

    /**
     * This public method dumps the given string to the console if taskTimer.debug===true and browser dom.window.dump.enabled===true
     * @param string String to dump
     * @returns boolean true
     **/
    this.log=function(component,msgString)
    {
		if(debug)
		{
			component=((typeof component==="string" && component.length>0)?component:"unknown component");
			dump("taskTimer ("+component+") says: "+msgString);
		}

		return true;
    }

    this.getTimeSec=function()
    {
       return parseInt(new Date().getTime()/1000);  //The standard implementation returns milliseconds, I want seconds.
    }

}

function taskTimerInvalidTaskNameException(msg)
{
    this.name="taskTimerInvalidTaskNameException";
    this.message=((msg===undefined)?null:msg);
}

function taskTimerTimeInputToShortException(msg)
{
    this.name="taskTimerTimeInputToShortException";
    this.message=((msg===undefined)?null:msg);
}

function taskTimerInvalidTimeInputException(msg)
{
    this.name="taskTimerInvalidTimeInputException";
    this.message=((msg===undefined)?null:msg);
}

function taskTimerInvalidTimeException(msg)
{
    this.name="taskTimerInvalidTimeException";
    this.message=((msg===undefined)?null:msg);
}

function taskTimerInvalidTimeStringException(msg)
{
    this.name="taskTimerInvalidTimeStringException";
    this.message=((msg===undefined)?null:msg);
}

function taskTimerInvalidAlertTypeException(msg)
{
    this.name="taskTimerInvalidAlertTypeException";
    this.message=((msg===undefined)?null:msg);
}

function taskTimerInvalidAlertStatusException(msg)
{
    this.name="taskTimerInvalidAlertStatusException";
    this.message=((msg===undefined)?null:msg);
}

function taskTimerInvalidWidgetAlertShowTimeException(msg)
{
	this.name="taskTimerInvalidWidgetAlertShowTimeException";
	this.message=((msg===undefined)?null:msg);
}

function taskTimerInvalidSoundTypeException(msg)
{
    this.name="taskTimerInvalidSoundTypeException";
    this.message=((msg===undefined)?null:msg);
}

function taskTimerInvalidSoundIDException(msg)
{
	this.name="taskTimerInvalidSoundIDException";
	this.message=((msg===undefined)?null:msg);
}

function taskTimerInvalidSortOrderException(msg)
{
	this.name="taskTimerInvalidSortOrderException";
	this.message=((msg===undefined)?null:msg);
}


function taskTimerInvalidViewModeException(msg)
{
	this.name="taskTimerInvalidViewModeException";
	this.message=((msg===undefined)?null:msg);
}

function taskTimerInvalidOptionNameException(msg)
{
	this.name="taskTimerInvalidOptionNameException";
	this.message=((msg===undefined)?null:msg);
}
