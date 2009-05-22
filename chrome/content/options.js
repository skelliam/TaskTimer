/*
	TeaTimer: A Firefox extension that protects you from oversteeped tea.
	Copyright (C) 2009 Philipp Söhnlein

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
function teaTimerOptionsWindow()
{
    var teaDB=new teaTimerTeaDB();
    const common=new teaTimerCommon();
    const sound=Components.classes["@mozilla.org/sound;1"].createInstance().QueryInterface(Components.interfaces.nsISound);
    const self=this;
    
    var tree=null; //container for the tree element (teelist)
    var treeBody=null; //container for tree body (treechildren element)
    var deleteButton=null; //container for the tea delete button
    var nameTxtField=document.getElementById("teaTimer-optionsNewTeaName");
    var timeTxtField=document.getElementById("teaTimer-optionsNewTeaTime");
	var selSortingOrder=null; //container for select box with sorting order
	var btnPreviewStartSound=null; //container for start sound preview button
	var btnPreviewEndSound=null; //container for end sound preview button
	var widgetShowTimeTxtField=null;
	
	var lengthOfLongestTeaName=null;
        
    this.init=function()
    {
        //general
        document.addEventListener("keypress",teaTimerOptionsWindowInstance.documentKeypress,false);
        document.getElementById("teaTimer-optionsWinBtnCancel").addEventListener("command",teaTimerOptionsWindowInstance.cancelButtonCommand,false);
        document.getElementById("teaTimer-optionsWinBtnOk").addEventListener("command",teaTimerOptionsWindowInstance.okButtonCommand,false);
        sound.init();
        
        //tea varities tab
        nameTxtField=document.getElementById("teaTimer-optionsNewTeaName");
        nameTxtField.addEventListener("keypress",teaTimerOptionsWindowInstance.addTxtFieldsKeypress,false);
		timeTxtField=document.getElementById("teaTimer-optionsNewTeaTime");
        timeTxtField.addEventListener("keypress",teaTimerOptionsWindowInstance.addTxtFieldsKeypress,false);
        
		document.getElementById("teaTimer-optionsBtnAddTea").addEventListener("command",teaTimerOptionsWindowInstance.addButtonCommand,false);
		tree=document.getElementById("teaTimer-optionsTeas");
		tree.addEventListener("select",teaTimerOptionsWindowInstance.treeSelected,false);
		treeBody=document.getElementById("teaTimer-optionsTeasTreeChildren");
		deleteButton=document.getElementById("teaTimer-optionsBtnDelTea");
		deleteButton.addEventListener("command",teaTimerOptionsWindowInstance.deleteSelectedTeas,false);
		
		fillTreeWithDBValues();
		
		selSortingOrder=document.getElementById("teaTimer-sortingOrder");
		initSortingSelectBox();
        
        //alerts tab
		var chkPopupAlert=document.getElementById("teaTimer-optionsPopupAlert");
		if(common.isAlertDesired("popup"))
		{
			chkPopupAlert.setAttribute("checked","true");
		}
		else
		{
			chkPopupAlert.removeAttribute("checked","false");
		}
		
		var chkStatusbarAlert=document.getElementById("teaTimer-optionsStatusbarAlert");
		if(common.isAlertDesired("statusbar"))
		{
			chkStatusbarAlert.setAttribute("checked","true");
		}
		else
		{
			chkStatusbarAlert.removeAttribute("checked","false");
		}
		
		var chkWidgetAlert=document.getElementById("teaTimer-optionsWidgetAlert");
		if(common.isAlertDesired("widget"))
		{
			chkWidgetAlert.setAttribute("checked","true");
		}
		else
		{
			chkWidgetAlert.removeAttribute("checked","false");
		}
		
		widgetShowTimeTxtField=document.getElementById("teaTimer-optionsWidgetShowTime");
		widgetShowTimeTxtField.value=common.getWidgetAlertShowTime();
		widgetShowTimeTxtField.addEventListener("keypress",teaTimerOptionsWindowInstance.widgetShowTimeTxtFieldKeypress,false);
		
        initSoundSelectBox("start");
        initSoundSelectBox("end");
		btnPreviewStartSound=document.getElementById("teaTimer-optionsBtnPreviewStartSound");
        btnPreviewStartSound.addEventListener("command",teaTimerOptionsWindowInstance.previewStartSound,false);
		btnPreviewEndSound=document.getElementById("teaTimer-optionsBtnPreviewEndSound");
        btnPreviewEndSound.addEventListener("command",teaTimerOptionsWindowInstance.previewEndSound,false);
        
        if(getValueOfSoundSelectBox("start")==="none")
        {
            btnPreviewStartSound.setAttribute("disabled",true);
        }
        
        if(getValueOfSoundSelectBox("end")==="none")
        {
            btnPreviewEndSound.setAttribute("disabled",true);
        }
		
		//twitter tab
		var twitterActiveCheckbox=document.getElementById("teaTimer-optionsTwitterActive");
		twitterActiveCheckbox.addEventListener("command",teaTimerOptionsWindowInstance.twitterActiveCommand,false);
		
		var twitterOnCountdownStartCheckbox=document.getElementById("teaTimer-optionsTwitterStartMessageCheckbox");
		twitterOnCountdownStartCheckbox.addEventListener("command",function() { teaTimerOptionsWindowInstance.twitterMessageBoxStateChanged("start"); },false);
		
		var twitterOnCountdownFinishCheckbox=document.getElementById("teaTimer-optionsTwitterFinishMessageCheckbox");
		twitterOnCountdownFinishCheckbox.addEventListener("command",function() { teaTimerOptionsWindowInstance.twitterMessageBoxStateChanged("finish"); },false);
		
		var twitterTestCredentialsButton=document.getElementById("teaTimer-optionsTwitterTestCredentials");
		twitterTestCredentialsButton.addEventListener("command",teaTimerOptionsWindowInstance.testTwitterCredentialsButtonCommand,false);
		
		
		var twitterIsOn=common.isTwitterFeatureOn();
		if(twitterIsOn)
		{
			twitterActiveCheckbox.checked=true;
			changeTwitterInputFieldsState("activate");
		}
		
		var twitterUsername=common.getTwitterUsername();
		if(twitterUsername)
		{
			document.getElementById("teaTimer-optionsTwitterUsername").value=twitterUsername;
		}
		
		var twitterPassword=common.getTwitterPassword();
		if(twitterPassword)
		{
			document.getElementById("teaTimer-optionsTwitterPassword").value=twitterPassword;
		}
		
		self.updateLengthOfLongestTeaName();
		document.getElementById("teaTimer-optionsTwitterTab").addEventListener("command",function() { teaTimerOptionsWindowInstance.updateCharsLeftBox("start"), teaTimerOptionsWindowInstance.updateCharsLeftBox("finish"); },false);
		
		if(common.twitterOnStart())
		{
			twitterOnCountdownStartCheckbox.checked=true;
			if(twitterIsOn)
			{
				self.twitterMessageBoxStateChanged("start");
			}
		}
		
		var tweetStartText=common.getTwitterTweetText("start");
		var tweetStartTextTxtBox=document.getElementById("teaTimer-optionsTwitterStartMessage");
		if(tweetStartText)
		{
			tweetStartTextTxtBox.value=tweetStartText;
		}
		setValueOfCharsLeftBox("start",recalculateCharsLeft("teaTimer-optionsTwitterStartMessage"));
		tweetStartTextTxtBox.addEventListener("keyup",teaTimerOptionsWindowInstance.startTweetTextChanged,false);
		tweetStartTextTxtBox.addEventListener("focus",teaTimerOptionsWindowInstance.updateLengthOfLongestTeaName,false);
		
		if(common.twitterOnFinish())
		{
			twitterOnCountdownFinishCheckbox.checked=true;
			if(twitterIsOn)
			{
				self.twitterMessageBoxStateChanged("finish");
			}
		}
		
		var tweetFinishText=common.getTwitterTweetText("finish");
		var tweetFinishTextTxtBox=document.getElementById("teaTimer-optionsTwitterFinishMessage");
		if(tweetFinishText)
		{
			tweetFinishTextTxtBox.value=tweetFinishText;
		}
		setValueOfCharsLeftBox("finish",recalculateCharsLeft("teaTimer-optionsTwitterFinishMessage"));
		tweetFinishTextTxtBox.addEventListener("keyup",teaTimerOptionsWindowInstance.finishTweetTextChanged,false);
		tweetFinishTextTxtBox.addEventListener("focus",teaTimerOptionsWindowInstance.updateLengthOfLongestTeaName,false);
		
		if(common.showCommunicationErrors())
		{
			document.getElementById("teaTimer-optionsTwitterAlertCommunicationErrors").checked=true;
		}
		
    }
    
    /**
     * This public method is called, when a key is pressed in the window, so it can handle shortcuts.
     **/
    this.documentKeypress=function(event)
    {
        if(event.keyCode===27) //escape
        {
            window.close();
        }
    }
    
    /**
     * This public method is called, when a key is pressed in one of the "add tea textfields". Useful for handling special inputs.
     **/
    this.addTxtFieldsKeypress=function(event)
    {
		if(event.keyCode===13) //enter
        {
            self.addButtonCommand();
        }
    }
    
	/**
	 * This public method is called, when a key is pressed in the teaTimer-optionsWidgetShowTime text field. Useful for handling special inputs.
	 **/
	this.widgetShowTimeTxtFieldKeypress=function(event)
	{
		if(event.keyCode===13) //enter
        {
            self.okButtonCommand();
        }
	}
	
    /**
     * This public method is called, when the "add tea" button is clicked.
     * It handles validation and adding a tea to the tree.
     **/
    this.addButtonCommand=function()
    {
        var inputok=false;
        var teaName=nameTxtField.value;
        var teaTime=timeTxtField.value;
        
		if(teaName.length<=0)
		{
			alert(common.getString("options.validate.nameErrorNoName"));
			nameTxtField.focus();
		}
		else
		{
			try
			{
					teaTime=common.validateEnteredTime(teaTime);
					inputok=true;
			}
			catch(e)
			{
			var errorMsg="";
			if(e.name==="teaTimerTimeInputToShortException")
			{
				errorMsg=common.getString("options.validate.timeInputToShort");
			}
			else
			{
				errorMsg=common.getString("options.validate.timeInputInWrongFormat");
			}
			  
			errorMsg+="\n"+common.getString("options.validate.timeInputAdvice");
			alert(errorMsg);
			timeTxtField.focus();
			}
		}
        
        if(inputok)
        {
            var newID=getLastTeaIDFromTree()+1;
            addTeaToTree(newID,teaName,teaTime);
            
            nameTxtField.value="";
            timeTxtField.value="";
            nameTxtField.focus();
        }
    }
    
    /**
     * This private method is used to find the ID of the last tea in the tealist.
     * @returns integer ID
     **/
    var getLastTeaIDFromTree=function()
    {
        var treerows=treeBody.getElementsByTagName("treerow");
        var lastID=null;
        for(var i=0; i<treerows.length; i++)
        {
            var id=parseInt(treerows[i].getElementsByTagName("treecell")[0].getAttribute("label"));
            if(id>lastID)
            {
                lastID=id;
            }
        }
        
        return lastID;
    }
    
    /**
     * This private method adds a tea into the tealist.
     * @param integer ID
     * @param string name
     * @param integer time (in seconds)
     **/
    var addTeaToTree=function(ID,name,time)
    {
        var parent=treeBody;
        var treerow=document.createElement("treerow");
		var treecell=document.createElement("treecell");
		treecell.setAttribute("label",ID);
        treecell.setAttribute("editable","false");
		treerow.appendChild(treecell);
	    
        var treeNameCell=document.createElement("treecell");
		treeNameCell.setAttribute("label",name);
		treeNameCell.setAttribute("editable","true");
		treerow.appendChild(treeNameCell);
	    
		var treeTimeCell=document.createElement("treecell");
		treeTimeCell.setAttribute("label",common.getTimeStringFromTime(time));
		treeTimeCell.setAttribute("editable","true");
		treerow.appendChild(treeTimeCell);
			
		var treeitem=document.createElement("treeitem");
		treeitem.appendChild(treerow);
			
		parent.appendChild(treeitem);
    }
    
    /**
     * This public method is called when the OK-button is pressed.
     * It validates the teas in the tealist and induces the final saving proccess.
     **/
    this.okButtonCommand=function()
    {
        if(treeBody.getElementsByTagName("treerow").length===0)
        {
            alert(common.getString("options.validate.noTeaInList"));
        }
        else
        {
            var valid=false;
            try
            {
                validateTeasInTree();
				validateAlertSettings();
				validateTwitterSettings();
				valid=true;
            }
            catch(e)
            {
				if(e.humanReadableOutput)
				{
					alert(e.humanReadableOutput);
				}
            }
            
            if(valid)
            {
                writeTreeTeasinDB();
				saveSortingOrder();
				saveAlerts();
				saveSounds();
				saveTwitterSettings();
                window.close();
            }
        }
    }
	
	/**
	 * This private method validates the alert settings and throws exceptions if there was an unvalid settings found.
	 * 
	 * @throws teaTimerInvalidSoundIDException
	 * @throws teaTimerInvalidSortOrderException
	 * @throws teaTimerInvalidWidgetAlertShowTimeException
	 **/
	var validateAlertSettings=function()
	{
		if(
			common.checkSoundId("start",getValueOfSoundSelectBox("start"))===false ||
			common.checkSoundId("end",getValueOfSoundSelectBox("end"))===false
		)
		{
			var ex=new teaTimerInvalidSoundIDException();
			ex.humanReadableOutput=common.getString("options.validate.soundError");
			throw ex;
		}
		
		try
		{
			common.validateSortingOrder(selSortingOrder.value);
		}
		catch(e)
		{
			var ex=new teaTimerInvalidSortOrderException();
			ex.humanReadbleOutput=common.getString("options.validate.sortingError");
			throw ex;
		}
		
		var widgetShowTime=parseInt(widgetShowTimeTxtField.value,10);
		if(!(widgetShowTime>=0))
		{
			var ex=new teaTimerInvalidWidgetAlertShowTimeException();
			ex.humanReadableOutput=common.getString("options.validate.widgetAlertShowTimeError");
			throw ex;
		}
		
		return true;
	}
	
	/**
	 * This private method validates the Twitter settings (username, password, "twitter is on", tweetstart- and tweetendtext)
	 *
	 * @throws teaTimerInvalidTwitterUsernameException
	 * @throws teaTimerInvalidTwitterPasswordException
	 * @throws teaTimerInvalidTwitterOnException
	 * @throws teaTimerInvalidTwitterTweetTextException
	 **/
	var validateTwitterSettings=function()
	{
		var twitterActiveCheckbox=document.getElementById("teaTimer-optionsTwitterActive");
		if(twitterActiveCheckbox.checked)
		{
			if(document.getElementById("teaTimer-optionsTwitterUsername").value.length<=0)
			{
				var ex=new teaTimerInvalidTwitterUsernameException();
				ex.humanReadableOutput=common.getString("options.validate.noTwitterUsername");
				throw ex;
			}
			
			if(document.getElementById("teaTimer-optionsTwitterPassword").value.length<=0)
			{
				var ex=new teaTimerInvalidTwitterPasswordException();
				ex.humanReadableOutput=common.getString("options.validate.noTwitterPassword");
				throw ex;
			}
			
			var twitterOnCountdownStartCheckbox=document.getElementById("teaTimer-optionsTwitterStartMessageCheckbox");
			var twitterOnCountdownFinishCheckbox=document.getElementById("teaTimer-optionsTwitterFinishMessageCheckbox")
			if(!twitterOnCountdownStartCheckbox.checked && !twitterOnCountdownFinishCheckbox.checked)
			{
				var ex=new teaTimerInvalidTwitterOnException();
				ex.humanReadableOutput=common.getString("options.validate.twitterActiveButNoTweetSpecified");
				throw ex;
			}
			
			if(twitterOnCountdownStartCheckbox.checked && document.getElementById("teaTimer-optionsTwitterStartMessage").value.length<=0)
			{
				var ex=new teaTimerInvalidTwitterTweetTextException();
				ex.humanReadableOutput=common.getString("options.validate.noTwitterStartMessage");
				throw ex;
			}
			
			if(twitterOnCountdownFinishCheckbox.checked && document.getElementById("teaTimer-optionsTwitterFinishMessage").value.length<=0)
			{
				var ex=new teaTimerInvalidTwitterTweetTextException();
				ex.humanReadableOutput=common.getString("options.validate.noTwitterFinishMessage");
				throw ex;
			}
		}
		
		return true;
	}
    
    /**
     * This private function checks if the fields in the tealist (tree) are valid.
     * @returns boolean true, if everything is okay
     * @throws teaTimerInvalidTeaNameException
     * @throws teaTimerInvalidTimeException
     **/
    var validateTeasInTree=function()
    {
        var treerows=treeBody.getElementsByTagName("treerow");
        for(var i=0; i<treerows.length; i++)
        {
            var treecells=treerows[i].getElementsByTagName("treecell");
            var treeTeaName=treecells[1].getAttribute("label");
            var treeTeaTime=treecells[2].getAttribute("label");
            if(common.trim(treeTeaName).length<=0)
            {
				var ex=new teaTimerInvalidTeaNameException();
				ex.humanReadableOutput=common.getStringf("options.validate.nameErrorInvalidName",new Array(""+(i+1)));
                throw ex;
            }
            
            try
            {
                common.validateEnteredTime(treeTeaTime);
            }
            catch(e)
            {
                var ex=new teaTimerInvalidTimeException();
				ex.humanReadbleOutput=common.getStringf("options.validate.timeInputWrong",new Array(treeTeaName+""));
				throw ex;
            }
        }
        
        return true;
    }
    
    /**
     * This private method dumps the current content of the tea list into the DB.
     **/
    var writeTreeTeasinDB=function()
    {
        var teasInDB=teaDB.getIDsOfTeas();
        var teasInList=new Array();
        //handle teas that are in the list
        var treerows=treeBody.getElementsByTagName("treerow");
        for(var i=0; i<treerows.length; i++)
        {
            var treecells=treerows[i].getElementsByTagName("treecell");
            var treeTeaID=parseInt(treecells[0].getAttribute("label"));
            common.log("Options","handling tea with ID "+treeTeaID+"\n");
            teasInList.push(treeTeaID);
            var treeTeaName=treecells[1].getAttribute("label");
            var treeTeaTime=common.getTimeFromTimeString(treecells[2].getAttribute("label"));
            if(!teaDB.checkTeaWithID(treeTeaID)) //tea is not in DB, add it
            {
                common.log("Options","Tea is not in DB, add it...\n");
                teasInDB.push(teaDB.addTea(treeTeaName,treeTeaTime));
                common.log("Options","Added.\n");
            }
            else //tea is in DB, check if teaData has changed
            {
                common.log("Options","Tea is in DB\n");
                var teaData=teaDB.getTeaData(treeTeaID);
                if(treeTeaName!=teaData["name"])
                {
                    common.log("Options","Setting name\n");
                    teaDB.setName(teaData["ID"],treeTeaName);
                }
                
                if(treeTeaTime!=teaData["time"])
                {
                    common.log("Options","Setting time\n");
                    teaDB.setTime(teaData["ID"],treeTeaTime);
                }
            }
        }
        
        //hide teas that are in DB, but not in the list. They will be deleted on next start
        for(var i in teasInDB)
        {
            if(common.in_array(teasInDB[i],teasInList)===false)
            {
                dump("Hidding tea with ID "+teasInDB[i]+"\n");
                teaDB.setHidden(teasInDB[i]);
                dump("Hidden.\n");
            }
        }
    }
    
    /**
     * This public method is called, when the cancel button is pressed. 
     **/
    this.cancelButtonCommand=function()
    {
        window.close();
    }
    
    /**
     * This public method is called, when a item in the tree is selected.
     * It handles also the "disabled"-state of the delete button.
     **/
    this.treeSelected=function()
    {
		var selectedItems=getSelectedTreeIndexes();
	
		deleteButton.setAttribute("disabled",((selectedItems.length>0)?"false":"true"));
    }
    
    /**
     * This private method checks which items in the tree are selected.
     * @returns array IDs of selected rows.
     **/
    var getSelectedTreeIndexes=function()
    {
		var rangeStartOffset=new Object();
		var rangeEndOffset=new Object();
		var rangeCount=tree.view.selection.getRangeCount();
		
		var selectedItems=new Array();
		
		for(var r=0; r<rangeCount; r++)
		{
			tree.view.selection.getRangeAt(r,rangeStartOffset,rangeEndOffset);
			
			for(var v=rangeStartOffset.value; v<=rangeEndOffset.value; v++)
			{
			selectedItems.push(v);
			}
		}
		
		return selectedItems;
    }
    
    /**
     * This private method checks how many teas are in the tealist (tree).
     * @return integer number of teas
     **/
    var getNumberOfTeasInTree=function()
	{
		return treeBody.getElementsByTagName("treeitem").length;
    }
	
	/**
	 * This public function updates the length of the longest tea name.
	 **/
	this.updateLengthOfLongestTeaName=function()
	{
		lengthOfLongestTeaName=getLengthOfLongestTeaNameInTree();
	}
	
	/**
	 * This private method reads the tree of all teanames and returns the length of the longest tea name.
	 * @return integer length of longest tea name
	 **/
	var getLengthOfLongestTeaNameInTree=function()
	{
		var teaNames=new Array();
		var treeRows=treeBody.getElementsByTagName("treerow");
		for(var i=0; i<treeRows.length; i++)
		{
			var cells=treeRows[i].getElementsByTagName("treecell");
			teaNames.push(cells[1].getAttribute("label"));
		}
		//dump(teaNames);
		
		var lengthOfLongestTeaName=0;
		for(var i in teaNames)
		{
			if(teaNames[i].length>lengthOfLongestTeaName)
			{
				lengthOfLongestTeaName=teaNames[i].length;
			}
		}
		//dump("longest:"+lengthOfLongestTeaName+"\n");
		return lengthOfLongestTeaName;
	}
    
    /**
     * This public method is called, when the "delete selected teas" button is pressed and removes the items from the tree.
     * It does not the deletion proccess, that is done, when the dialog is closed with "OK".
     **/
    this.deleteSelectedTeas=function()
    {
		var selectedItems=getSelectedTreeIndexes();
		var treeitems=tree.getElementsByTagName("treeitem");
		var deletedItems=0;
		var i=0;
		do
		{
			if(i===selectedItems[deletedItems])
			{
			treeBody.removeChild(treeitems[selectedItems[deletedItems]-deletedItems]);
			deletedItems++;
			}
			
			i++;
		} while(deletedItems<selectedItems.length);
    }
    
    /**
     * This private method adds the current database content into the tea list (tree).
     **/
    var fillTreeWithDBValues=function()
    {
		var teas=teaDB.getDataOfAllTeas();
		for(var i in teas)
		{
			var tea=teas[i];
			addTeaToTree(tea["ID"],tea["name"],tea["time"]);
		}
    }
    
	/**
	 * This private method inits either the sorting select box (menulist).
	 * That means, it sets the currently saved sorting mechanism as selected.
	 **/
	var initSortingSelectBox=function()
	{
		var sortingOrder=common.getSortingOrder();
		var sortingOrderParentNode=selSortingOrder.getElementsByTagName("menupopup")[0];
		for(var i=0; i<sortingOrderParentNode.childNodes.length; i++)
		{
			var child=sortingOrderParentNode.childNodes[i];
			if(child.getAttribute("value")===sortingOrder)
			{
				selSortingOrder.selectedIndex=i;
				break;
			}
		}
	}
	
	/**
	 * This private method inits either the startsound or the endsound select box (menulist).
	 * That means, it adds events and sets the currently saved sound as selected.
	 * @param string type ("start" or "end")
	 **/
    var initSoundSelectBox=function(type)
    {
        type=(type==="start")?"start":"end";
        
        if(type==="start")
        {
            var currentSound=common.getIdOfStartSound();
            var box=document.getElementById("teaTimer-optionsStartSound");
            box.addEventListener("command",teaTimerOptionsWindowInstance.startSoundChanged,false);
        }
        
        if(type==="end")
        {
            var currentSound=common.getIdOfEndSound();
            var box=document.getElementById("teaTimer-optionsEndSound");
            document.getElementById("teaTimer-optionsEndSound").addEventListener("command",teaTimerOptionsWindowInstance.endSoundChanged,false);
        }
        
        var sounds=box.getElementsByTagName("menuitem");
        for(var i=0; i<sounds.length; i++)
        {
            if(sounds[i].getAttribute("value")===currentSound)
            {
                box.selectedIndex=i;
            }
        }
    }
    
	/**
	 * This public method is called when the start sound changes.
	 **/
    this.startSoundChanged=function()
    {
        soundChanged("start");
    }
    
	/**
	 * This public method is called when the end sound changes.
	 **/
    this.endSoundChanged=function()
    {
        soundChanged("end");
    }
    
	/**
	 * This private checks if some action needs to be done, when a sound select box (menulist) changes.
	 * It currently only enables or disables the preview button, depending on the choosen values.
	 * @param type soundType ("start" or "end")
	 **/
    var soundChanged=function(type)
    {
        type=(type==="start")?"start":"end";
        
        var idOfSelectBox=null;
        var previewButton=null;
        if(type==="start")
        {
            idOfSelectBox="teaTimer-optionsStartSound";
            previewButton=btnPreviewStartSound;
        }
        else
        {
            idOfSelectBox="teaTimer-optionsEndSound";
            previewButton=btnPreviewEndSound;
        }
        
        if(document.getElementById(idOfSelectBox).value==="none")
        {
            previewButton.setAttribute("disabled",true);
        }
        else
        {
            previewButton.removeAttribute("disabled");
        }
    }
    
	/**
	 * This public method previews (plays) the start sound.
	 **/
    this.previewStartSound=function()
    {
        previewSound("start");
    }
    
	/**
	 * This public method previews (plays) the end sound.
	 **/
    this.previewEndSound=function()
    {
        previewSound("end");
    }
    
	/**
	 * This private method previews (plays) either the start or the end sound.
	 **/
    var previewSound=function(type)
    {
        type=(type==="start")?"start":"end";
		var urlObj=common.getURLtoSound(type,getValueOfSoundSelectBox(type),true);
		sound.play(urlObj);
    }
	
	/**
	 * This private method returns the sound ID of the currently selected start or end sound.
	 * @param string type ("start" or "end")
	 * @return string soundID
	 **/
	var getValueOfSoundSelectBox=function(type)
	{
		type=(type==="start")?"start":"end";
		var idOfSelectBox=((type==="start")?"teaTimer-optionsStartSound":"teaTimer-optionsEndSound");
		return document.getElementById(idOfSelectBox).value;
	}
	
	/**
	 * This method bundles all the "writing alerts to stored preferences"-stuff.
	 **/
	var saveAlerts=function()
	{
		var popupValue=document.getElementById("teaTimer-optionsPopupAlert").getAttribute("checked");
		popupValue=(popupValue==="true")?true:false;
		common.setAlert("popup",popupValue);
		
		var statusbarValue=document.getElementById("teaTimer-optionsStatusbarAlert").getAttribute("checked");
		statusbarValue=(statusbarValue==="true")?true:false;
		common.setAlert("statusbar",statusbarValue);
		
		var widgetValue=document.getElementById("teaTimer-optionsWidgetAlert").getAttribute("checked");
		widgetValue=(widgetValue==="true")?true:false;
		common.setAlert("widget",widgetValue);
		
		common.setWidgetAlertShowTime(parseInt(widgetShowTimeTxtField.value,10));
	}
	
	/**
	 * This private method saves the sorting order in the options "database".
	 **/
	var saveSortingOrder=function()
	{
		common.setSortingOrder(selSortingOrder.value);
	}
	
	/**
	 * This private method saves the start end the end sounds into the options "database".
	 **/
	var saveSounds=function()
	{
		common.setSound("start",getValueOfSoundSelectBox("start"));
		common.setSound("end",getValueOfSoundSelectBox("end"));
	}
	
	/**
	 * This public method is called, when you change the value of the twitter active checkbox.
	 **/
	this.twitterActiveCommand=function()
	{
		var twitterActiveCheckbox=document.getElementById("teaTimer-optionsTwitterActive");
		changeTwitterInputFieldsState((twitterActiveCheckbox.checked)?"activate":"deactivate");
	}
	
	/**
	 * This private method activates or deactives the twitter input fields according to the first param.
	 * 
	 * @param string mode ("activate" or "deactivate")
	 **/
	var changeTwitterInputFieldsState=function(mode)
	{
		mode=(mode==="activate")?"activate":"deactivate";
		var fields=["teaTimer-optionsTwitterUsernameLabel","teaTimer-optionsTwitterUsername","teaTimer-optionsTwitterPasswordLabel","teaTimer-optionsTwitterPassword","teaTimer-optionsTwitterTestCredentials","teaTimer-optionsTwitterStartMessageCheckbox","teaTimer-optionsTwitterStartMessageLabel","teaTimer-optionsTwitterStartMessage","teaTimer-optionsTwitterFinishMessageCheckbox","teaTimer-optionsTwitterFinishMessageLabel","teaTimer-optionsTwitterFinishMessage","teaTimer-optionsTwitterAlertCommunicationErrors"];
		
		for(var i in fields)
		{
			var field=document.getElementById(fields[i]);
			
			if(
				((fields[i]==="teaTimer-optionsTwitterStartMessageLabel" || fields[i]==="teaTimer-optionsTwitterStartMessage") && !document.getElementById("teaTimer-optionsTwitterStartMessageCheckbox").checked) ||
				((fields[i]==="teaTimer-optionsTwitterFinishMessageLabel" || fields[i]==="teaTimer-optionsTwitterFinishMessage") && !document.getElementById("teaTimer-optionsTwitterFinishMessageCheckbox").checked)
			)
			{
				///field.removeAttribute("disabled");
				continue;
			}
			
			if(mode==="activate")
			{
				field.removeAttribute("disabled");
			}
			else
			{
				field.setAttribute("disabled","true");
			}
		}
	}
	
	/**
	 * This public function is called, when the checkbox according to one of the two twitter message text boxes is used.
	 *
	 * @param string which ("start" or "finish")
	 * 
	 **/
	this.twitterMessageBoxStateChanged=function(which)
	{
		which=(which==="start")?"start":"finish";
		var chkbox=document.getElementById("teaTimer-optionsTwitter"+((which==="start")?"Start":"Finish")+"MessageCheckbox");
		var txtbox=document.getElementById("teaTimer-optionsTwitter"+((which==="start")?"Start":"Finish")+"Message");
		var label=document.getElementById("teaTimer-optionsTwitter"+((which==="start")?"Start":"Finish")+"MessageLabel");
		
		if(chkbox.checked)
		{
			txtbox.removeAttribute("disabled");
			label.removeAttribute("disabled");
		}
		else
		{
			txtbox.setAttribute("disabled","true");
			label.setAttribute("disabled","true");
		}
		
	}
	
	/**
	 * This private function saves the settings made in the twitter settings dialog.
	 **/ 
	var saveTwitterSettings=function()
	{
		common.setTwitterFeature(document.getElementById("teaTimer-optionsTwitterActive").checked);
		common.setTwitterUsername(document.getElementById("teaTimer-optionsTwitterUsername").value);
		common.setTwitterPassword(document.getElementById("teaTimer-optionsTwitterPassword").value);
		common.setTwitterEvent("start",document.getElementById("teaTimer-optionsTwitterStartMessageCheckbox").checked);
		common.setTweetText("start",document.getElementById("teaTimer-optionsTwitterStartMessage").value);
		common.setTwitterEvent("finish",document.getElementById("teaTimer-optionsTwitterFinishMessageCheckbox").checked);
		common.setTweetText("finish",document.getElementById("teaTimer-optionsTwitterFinishMessage").value);
		common.setShowCommunicationErrors(document.getElementById("teaTimer-optionsTwitterAlertCommunicationErrors").checked);
	}
	
	/**
	 * This public method is called, when the 2test twitter credential buttons" was clicked.
	 **/
	this.testTwitterCredentialsButtonCommand=function()
	{
		var username=document.getElementById("teaTimer-optionsTwitterUsername").value;
		var password=document.getElementById("teaTimer-optionsTwitterPassword").value;
		var loadingBox=document.getElementById("teaTimer-optionsTwitterTestCredentialLoadingBox");
		var button=document.getElementById("teaTimer-optionsTwitterTestCredentials");
		try
		{
			var img=document.createElement("image");
			img.setAttribute("src","chrome://global/skin/icons/loading_16.png");
			img.setAttribute("tooltiptext",common.getString("options.twitter.test.checkingCredentials"));
			loadingBox.appendChild(img);
			button.setAttribute("disabled","true");
			var twitter=new jsTwitter(username,password);
			var statusTxt=common.getString("options.twitter.test.credentials"+((twitter.verifyCredentials())?"Ok":"Wrong"));
			alert(statusTxt);
		}
		catch(ex)
		{
			alert(common.getString("options.twitter.test.networkError"));
		}
		
		//clear loadingbox
		while(loadingBox.childNodes.length>0)
		{
			loadingBox.removeChild(loadingBox.childNodes[0]);
		}
		
		button.setAttribute("disabled","false");
	}
	
	/**
	 * This public method is called, when the text of the start tweet was changed.
	 **/
	this.startTweetTextChanged=function()
	{
		tweetTextChanged("start");
	}
	
	/**
	 * This public method is called, when the text of the finish tweet was changed.
	 **/
	this.finishTweetTextChanged=function()
	{
		tweetTextChanged("finish");
	}
	
	/**
	 * This private method is called, when the text of one of the tweet textareas was changed.
	 * @param string mode ("start" or "finish")
	 **/
	var tweetTextChanged=function(mode)
	{
		var box="teaTimer-optionsTwitter"+((mode==="start")?"Start":"Finish")+"Message";
		setValueOfCharsLeftBox(mode,recalculateCharsLeft(box));
	}
	
	/**
	 * This method takes the content of the given textfield, counts the length, and returns the length of still available chars (including mechanism, if %t is used).
	 * @param string domId
	 * @returns integer chars that are left
	 **/ 
	var recalculateCharsLeft=function(box)
	{
		var text=document.getElementById(box).value;
		var estimatedLength=text.length;
		if(text.indexOf("%t")>=0)
		{
			estimatedLength-=2;
			estimatedLength+=lengthOfLongestTeaName;
		}
		
		return 140-estimatedLength;
	}
	
	/**
	 * This method writes the "chars left"-value to the correct destination in the XUL document.
	 * It also applies specific CSS classes, to signalize shortness.
	 * 
	 * @param string mode ("start" or "finish")
	 * @param integer charsLeft
	 **/
	var setValueOfCharsLeftBox=function(mode,charsLeft)
	{
		var boxName="teaTimer-optionsTwitter"+((mode==="start")?"Start":"Finish")+"MessageCharsLeft";
		var box=document.getElementById(boxName);
		box.firstChild.data=charsLeft;
		
		if(charsLeft>=20)
		{
			box.removeAttribute("class");
		}
		else if(charsLeft<20 && charsLeft>=10)
		{
			box.setAttribute("class","fewCharsLeft");
		}
		else
		{
			box.setAttribute("class","veryFewCharsLeft");
		}
	}
	
	/**
	 * This public function should be called, if the "chars left" display should be updated.
	 *
	 * @param mode ("start" or "finish");
	 * 
	 **/
	this.updateCharsLeftBox=function(mode)
	{
		self.updateLengthOfLongestTeaName();
		var boxName="teaTimer-optionsTwitter"+((mode==="start")?"Start":"Finish")+"Message";
		setValueOfCharsLeftBox(mode,recalculateCharsLeft(boxName));
	}
}

var teaTimerOptionsWindowInstance=new teaTimerOptionsWindow();
window.addEventListener("load",teaTimerOptionsWindowInstance.init,false);

