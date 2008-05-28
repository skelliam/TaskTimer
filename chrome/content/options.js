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
    const self=this;
    
    var tree=null; //container for the tree element (teelist)
    var treeBody=null; //container for tree body (treechildren element)
    var deleteButton=null; //container for the tea delete button
    var nameTxtField=document.getElementById("teaTimer-optionsNewTeaName");
    var timeTxtField=document.getElementById("teaTimer-optionsNewTeaTime");
        
    this.init=function()
    {
        document.addEventListener("keypress",teaTimerOptionsWindowInstance.documentKeypress,false);
        document.getElementById("teaTimer-optionsWinBtnCancel").addEventListener("command",teaTimerOptionsWindowInstance.cancelButtonCommand,false);
        document.getElementById("teaTimer-optionsWinBtnOk").addEventListener("command",teaTimerOptionsWindowInstance.okButtonCommand,false);
        
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
    }
    
    this.documentKeypress=function(event)
    {
        if(event.keyCode===27) //escape
        {
            window.close();
        }
    }
    
    this.addTxtFieldsKeypress=function(event)
    {
	if(event.keyCode===13) //enter
        {
            self.addButtonCommand();
        }
    }
    
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
                valid=true;
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
                window.close();
            }
        }
    }
    
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
                dump(treeTeaTime);
                common.validateEnteredTime(treeTeaTime);
            }
            catch(e)
            {
                throw new teaTimerInvalidTeaTimeException("Tea time of tea "+treeTeaName+" is not valid. You should enter the time in seconds (130 for example) or as minute:seconds (2:10 for example).\nPlease correct.");
            }
        }
        
        return true;
    }
    
    var writeTreeTeasinDB=function()
    {
        try
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
        catch(e)
        {
            dump(e);
        }
    }
    
    this.cancelButtonCommand=function()
    {
        window.close();
    }
    
    this.treeSelected=function()
    {
	var selectedItems=getSelectedTreeIndexes();
	
	deleteButton.setAttribute("disabled",((selectedItems.length>0)?"false":"true"));
    }
    
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
    
    var getNumberOfTeasInTree=function()
    {
	return treeBody.getElementsByTagName("treeitem").length;
    }
    
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
    
    var fillTreeWithDBValues=function()
    {
	var teas=teaDB.getDataOfAllTeas();
	for(var i in teas)
	{
	    var tea=teas[i];
	    addTeaToTree(tea["ID"],tea["name"],tea["time"]);
	}
    }
}

var teaTimerOptionsWindowInstance=new teaTimerOptionsWindow();
window.addEventListener("load",teaTimerOptionsWindowInstance.init,false);
