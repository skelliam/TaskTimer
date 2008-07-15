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
	var btnPreviewStartSound=null; //container for start sound preview button
	var btnPreviewEndSound=null; //container for end sound preview button
	var widgetShowTimeTxtField=null;
        
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
	 * 
	 **/
	this.widgetShowTimeTxtFieldKeypress=function(event)
	{
		alert("IN");
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
	    alert("Please type in a name for the new tea.");
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
		    errorMsg="Your time input was to short.";
		}
		else
		{
		    errorMsg="Your time input was in the wrong format."
		}
		  
		errorMsg+="\nYou should enter the time in seconds (130 for example) or as minute:seconds (2:10 for example).";
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
            alert("Ah, come on, there must be some tea you like. Please add at least one, otherwise this extension would be quite useless, don't you think?");
        }
        else
        {
            var valid=false;
            try
            {
                validateTeasInTree();
				if(
					common.checkSoundId("start",getValueOfSoundSelectBox("start"))===false ||
					common.checkSoundId("end",getValueOfSoundSelectBox("end"))===false
				)
				{
					alert("There's something wrong with the sounds you have choosen. Please check your choice.");
				}
				else
				{
					var widgetShowTime=parseInt(widgetShowTimeTxtField.value,10);
					if(!(widgetShowTime>=0))
					{
						alert("Please check your input in the text field 'Number of seconds the widget disappears automatically'. Only numbers greater or equal zero are allowed.");
					}
					else
					{
						valid=true;
					}
				}
            }
            catch(e)
            {
                if(e.name==="teaTimerInvalidTeaNameException" || e.name==="teaTimerInvalidTeaTimeException")
                {
                    alert(e.message);
                }
            }
            
            if(valid)
            {
                writeTreeTeasinDB();
				saveAlerts();
				saveSounds();
                window.close();
            }
        }
    }
    
    /**
     * This private function checks if the fields in the tealist (tree) are valid.
     * @returns boolean true, if everything is okay
     * @throws teaTimerInvalidTeaNameException
     * @throws teaTimerInvalidTeaTimeException
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
                throw new teaTimerInvalidTeaNameException("Tea name in row "+(i+1)+" is not valid.");
            }
            
            try
            {
                common.validateEnteredTime(treeTeaTime);
            }
            catch(e)
            {
                throw new teaTimerInvalidTeaTimeException("Tea time of tea "+treeTeaName+" is not valid. You should enter the time in seconds (130 for example) or as minute:seconds (2:10 for example).\nPlease correct.");
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
        
        //hideteas that are in DB, but not in the list. They will be deleted on next start
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
	}while(deletedItems<selectedItems.length);
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
	 * This private method saves the start end the end sounds into the options "database".
	 **/
	var saveSounds=function()
	{
		common.setSound("start",getValueOfSoundSelectBox("start"));
		common.setSound("end",getValueOfSoundSelectBox("end"));
	}
}

var teaTimerOptionsWindowInstance=new teaTimerOptionsWindow();
window.addEventListener("load",teaTimerOptionsWindowInstance.init,false);
