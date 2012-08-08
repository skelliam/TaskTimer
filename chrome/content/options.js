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
function taskTimerOptionsWindow()
{
   var taskDB=new taskTimerTaskDB();
   const common=new taskTimerCommon();
   const sound=Components.classes["@mozilla.org/sound;1"].createInstance().QueryInterface(Components.interfaces.nsISound);
   const self=this;
    
   var tree=null; //container for the tree element (teelist)
   var treeBody=null; //container for tree body (treechildren element)
   var deleteButton=null; //container for the task delete button
   var nameTxtField=document.getElementById("taskTimer-optionsNewTaskName");
   var selSortingOrder=null; //container for select box with sorting order
   var btnPreviewStartSound=null; //container for start sound preview button
   var btnPreviewEndSound=null; //container for end sound preview button
   var widgetShowTimeTxtField=null;
    
   var currentStartSoundValue=null;
   var currentEndSoundValue=null;
       
   this.init=function()
   {
      //general
      document.addEventListener("keypress",taskTimerOptionsWindowInstance.documentKeypress,false);
      document.getElementById("taskTimer-optionsWinBtnCancel").addEventListener("command",taskTimerOptionsWindowInstance.cancelButtonCommand,false);
      document.getElementById("taskTimer-optionsWinBtnOk").addEventListener("command",taskTimerOptionsWindowInstance.okButtonCommand,false);
      sound.init();
       
      //task types tab
      nameTxtField=document.getElementById("taskTimer-optionsNewTaskName");
      nameTxtField.addEventListener("keypress",taskTimerOptionsWindowInstance.addTxtFieldsKeypress,false);
       
      document.getElementById("taskTimer-optionsBtnAddTask").addEventListener("command",taskTimerOptionsWindowInstance.addButtonCommand,false);
      tree=document.getElementById("taskTimer-optionsTasks");
      tree.addEventListener("select",taskTimerOptionsWindowInstance.treeSelected,false);
      treeBody=document.getElementById("taskTimer-optionsTasksTreeChildren");
      deleteButton=document.getElementById("taskTimer-optionsBtnDelTask");
      deleteButton.addEventListener("command",taskTimerOptionsWindowInstance.deleteSelectedTasks,false);
       
      fillTreeWithDBValues();
       
      selSortingOrder=document.getElementById("taskTimer-sortingOrder");
      initSortingSelectBox();

      //reporting tab
      var prefs = common.getReportingPrefs();
      var chkShowAccumulated=document.getElementById("taskTimer-optionsShowAccumulatedTime");
      var txtAccumSinceTime=document.getElementById("taskTimer-optionsAccumulatedStartTime");
      chkShowAccumulated.setAttribute("checked", prefs.showAccumulatedTime ? "true" : "false");
      txtAccumSinceTime.value = prefs.showAccumulatedTimeSince;
      
      //alerts tab
      var chkPopupAlert=document.getElementById("taskTimer-optionsPopupAlert");
       
      if(common.isAlertDesired("popup"))
      {
         chkPopupAlert.setAttribute("checked","true");
      }
      else
      {
         chkPopupAlert.removeAttribute("checked","false");
      }
       
      var chkStatusbarAlert=document.getElementById("taskTimer-optionsStatusbarAlert");
      if(common.isAlertDesired("statusbar"))
      {
         chkStatusbarAlert.setAttribute("checked","true");
      }
      else
      {
         chkStatusbarAlert.removeAttribute("checked","false");
      }
       
      var chkWidgetAlert=document.getElementById("taskTimer-optionsWidgetAlert");
      if(common.isAlertDesired("widget"))
      {
         chkWidgetAlert.setAttribute("checked","true");
      }
      else
      {
         chkWidgetAlert.removeAttribute("checked","false");
      }
       
      widgetShowTimeTxtField=document.getElementById("taskTimer-optionsWidgetShowTime");
      widgetShowTimeTxtField.value=common.getWidgetAlertShowTime();
      widgetShowTimeTxtField.addEventListener("keypress",taskTimerOptionsWindowInstance.widgetShowTimeTxtFieldKeypress,false);
      
      initSoundSelectBox("start");
      initSoundSelectBox("end");
      btnPreviewStartSound=document.getElementById("taskTimer-optionsBtnPreviewStartSound");
      btnPreviewStartSound.addEventListener("command",taskTimerOptionsWindowInstance.previewStartSound,false);
      btnPreviewEndSound=document.getElementById("taskTimer-optionsBtnPreviewEndSound");
      btnPreviewEndSound.addEventListener("command",taskTimerOptionsWindowInstance.previewEndSound,false);
       
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
    * This public method is called, when a key is pressed in one of the "add task textfields". Useful for handling special inputs.
    **/
   this.addTxtFieldsKeypress=function(event)
   {
   if(event.keyCode===13) //enter
      {
         self.addButtonCommand();
      }
   }
    
   /**
    * This public method is called, when a key is pressed in the taskTimer-optionsWidgetShowTime text field. Useful for handling special inputs.
    **/
   this.widgetShowTimeTxtFieldKeypress=function(event)
   {
   if(event.keyCode===13) //enter
   {
      self.okButtonCommand();
   }
   }
    
   /**
    * This public method is called, when the "add task" button is clicked.
    * It handles validation and adding a task to the tree.
    **/
   this.addButtonCommand=function()
   {
     var taskName=nameTxtField.value;
       
     if(taskName.length<=0)
     {
       alert(common.getString("options.validate.nameErrorNoName"));
       nameTxtField.focus();
     }
     else
     {
      taskDB.addTask(taskName, 0, 0);
      removeAllTasksFromTree();  //clear out the tree
      fillTreeWithDBValues();    //refresh the tree
      nameTxtField.value="";     //clear the inputboxes
      nameTxtField.focus();
     }

   }
    
    
   /**
    * This private method adds a task into the tasklist.
    * @param integer ID
    * @param string name
    * @param integer time (in seconds)
    **/
   var addTaskToTree=function(ID,name,time)
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

   var removeAllTasksFromTree=function()
   {
      while (treeBody.firstChild) {
       treeBody.removeChild(treeBody.firstChild);
      }
   }


    
   /**
    * This public method is called when the OK-button is pressed.
    * It validates the tasks in the tasklist and induces the final saving proccess.
    **/
   this.okButtonCommand=function()
   {
      saveReporting();
      if(treeBody.getElementsByTagName("treerow").length===0)
      {
         alert(common.getString("options.validate.noTaskInList"));
      }
      else
      {
         var valid=false;
         try
         {
            validateTasksInTree();
            validateAlertSettings();
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
            writeTreeTasksinDB();
            saveSortingOrder();
            saveReporting();
            saveAlerts();
            saveSounds();
         }
      }
      window.close();
   }
   
   /**
    * This private method validates the alert settings and throws exceptions if there was an unvalid settings found.
    * 
    * @throws taskTimerInvalidSoundIDException
    * @throws taskTimerInvalidSortOrderException
    * @throws taskTimerInvalidWidgetAlertShowTimeException
    **/
   var validateAlertSettings=function()
   {
      if (
      common.checkSoundId("start",getValueOfSoundSelectBox("start"))===false ||
      common.checkSoundId("end",getValueOfSoundSelectBox("end"))===false
         )
      {
      var ex=new taskTimerInvalidSoundIDException();
      ex.humanReadableOutput=common.getString("options.validate.soundError");
      throw ex;
      }
      
      try
      {
      common.validateSortingOrder(selSortingOrder.value);
      }
      catch(e)
      {
      var ex=new taskTimerInvalidSortOrderException();
      ex.humanReadbleOutput=common.getString("options.validate.sortingError");
      throw ex;
      }
       
      var widgetShowTime=parseInt(widgetShowTimeTxtField.value,10);
      if(!(widgetShowTime>=0))
      {
      var ex=new taskTimerInvalidWidgetAlertShowTimeException();
      ex.humanReadableOutput=common.getString("options.validate.widgetAlertShowTimeError");
      throw ex;
      }
       
      return true;
   }
    
   /**
    * This private function checks if the fields in the tasklist (tree) are valid.
    * @returns boolean true, if everything is okay
    * @throws taskTimerInvalidTaskNameException
    * @throws taskTimerInvalidTimeException
    **/
   var validateTasksInTree=function()
   {
      var treerows=treeBody.getElementsByTagName("treerow");
      for(var i=0; i<treerows.length; i++)
      {
         var treecells=treerows[i].getElementsByTagName("treecell");
         var treeTaskName=treecells[1].getAttribute("label");
         var treeTaskTime=treecells[2].getAttribute("label");
         if(common.trim(treeTaskName).length<=0)
         {
      var ex=new taskTimerInvalidTaskNameException();
      ex.humanReadableOutput=common.getStringf("options.validate.nameErrorInvalidName",new Array(""+(i+1)));
             throw ex;
         }
         
         try
         {
             common.validateEnteredTime(treeTaskTime);
         }
         catch(e)
         {
             var ex=new taskTimerInvalidTimeException();
      ex.humanReadbleOutput=common.getStringf("options.validate.timeInputWrong",new Array(treeTaskName+""));
      throw ex;
         }
      }
       
      return true;
   }
    
   /**
    * This private method dumps the current content of the task list into the DB.
    **/
   var writeTreeTasksinDB=function()
   {
      var tasksInDB=taskDB.getIDsOfTasks();

      var tasksInList=new Array();
      //handle tasks that are in the list
      var treerows=treeBody.getElementsByTagName("treerow");
      for(var i=0; i<treerows.length; i++)
      {
         var treecells=treerows[i].getElementsByTagName("treecell");
         var treeTaskID=parseInt(treecells[0].getAttribute("label"));
         common.log("Options","handling task with ID "+treeTaskID+"\n");
         tasksInList.push(treeTaskID);
         var treeTaskName=treecells[1].getAttribute("label");
         var treeTaskTime=common.getTimeFromTimeString(treecells[2].getAttribute("label"));
         if(!taskDB.checkTaskWithID(treeTaskID)) //task is not in DB, add it
         {
            common.log("Options","Task is not in DB, add it...\n");
            tasksInDB.push(taskDB.addTask(treeTaskName,0,0));  //FIXME: taskname, time, hidden <-- get rid of time!
            common.log("Options","Added.\n");
         }
         else //task is in DB, check if taskData has changed
         {
            common.log("Options","Task is in DB\n");
            var taskData=taskDB.getTaskData(treeTaskID);
            if(treeTaskName!=taskData["name"])
            {
               common.log("Options","Setting name\n");
               taskDB.setName(taskData["ID"],treeTaskName);
            }
             
            if(treeTaskTime!=taskData["time"])
            {
               common.log("Options","Setting time\n");
               taskDB.setTime(taskData["ID"],treeTaskTime);
            }
         }
      }
       
      //hide tasks that are in DB, but not in the list. They will be deleted on next start
      for(var i in tasksInDB)
      {
         if(common.in_array(tasksInDB[i],tasksInList)===false)
         {
            dump("Hidding task with ID "+tasksInDB[i]+"\n");
            taskDB.setHidden(tasksInDB[i]);
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
    * This private method checks how many tasks are in the tasklist (tree).
    * @return integer number of tasks
    **/
   var getNumberOfTasksInTree=function()
   {
   return treeBody.getElementsByTagName("treeitem").length;
   }
    
   /**
    * This public method is called, when the "delete selected tasks" button is pressed and removes the items from the tree.
    * It does not the deletion proccess, that is done, when the dialog is closed with "OK".
    **/
   this.deleteSelectedTasks=function()
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
   * This private method adds the current database content into the task list (tree).
   **/
   var fillTreeWithDBValues=function()
   {
     var tasks=taskDB.getDataOfAllTasks();
     for(var i in tasks)
     {
      var task=tasks[i];
      //don't put the idle task in the tree
      if (task.id != 1) {
         //XXX: Right now showing time for last 24 hrs.
         var time = taskDB.getTimeWorkedOnTaskInRange(task.id, common.getTimeSec()-(24*60*60), common.getTimeSec());
         addTaskToTree(task.id, task.name, time);  //time in seconds gets converted to string
      }
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
       
      var customSoundMenuItem=null;
      if(type==="start")
      {
         var currentSound=common.getIdOfStartSound();
         var box=document.getElementById("taskTimer-optionsStartSound");
         box.addEventListener("command",taskTimerOptionsWindowInstance.startSoundChanged,false);
         customSoundMenuItem=document.getElementById("taskTimer-optionsStartSoundCustom");
      }
       
      if(type==="end")
      {
         var currentSound=common.getIdOfEndSound();
         var box=document.getElementById("taskTimer-optionsEndSound");
         document.getElementById("taskTimer-optionsEndSound").addEventListener("command",taskTimerOptionsWindowInstance.endSoundChanged,false);
         customSoundMenuItem=document.getElementById("taskTimer-optionsEndSoundCustom");
      }
      
      customSoundMenuItem.addEventListener("command", function (event) { taskTimerOptionsWindowInstance.customSoundMenuItemCommand(type); } , false);
       
      var sounds=box.getElementsByTagName("menuitem");

      for(var i=0; i<sounds.length; i++)
      {
         var value=sounds[i].getAttribute("value");
         var found=false;
         if(value===currentSound)
         {
            if(type==='start') {
               currentStartSoundValue=value;
            }
            else {
               currentEndSoundValue=value;
            }
      
            found=1;
         }
         else if(value==="custom: unset" && currentSound.match(/^custom\:.*\.wav/)) {
            if(type==='start') {
               currentStartSoundValue='custom';
            }
            else {
               currentEndSoundValue='custom';
            }
      
            sounds[i].label+=" ("+common.basename(currentSound)+")";
            sounds[i].value=currentSound;
            
            found=1;
         }
        
         if(found) {
            box.selectedIndex=i;
            break;
         }
      }
   }
   
   this.customSoundMenuItemCommand=function(type) {
      var fallbackValue=(type==='start') ? currentStartSoundValue : currentEndSoundValue;
      if (fallbackValue==="custom") {
         fallbackValue=common.getIdOfStartSound(); //retrieve full URL of custom sound
      }
      showCustomSoundFilePicker(type,fallbackValue);
   }

   var showCustomSoundFilePicker=function(type,fallbackValue) {
   type=(type==="start")?"start":"end";
   
   var nsIFilePicker = Components.interfaces.nsIFilePicker;
   var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
   fp.appendFilter(common.getString("options.sound.customSoundFilePicker.filter"),"*.wav");
   fp.init(window, "TaskTimer - "+common.getString("options.sound.customSoundFilePicker.windowTitle"), nsIFilePicker.modeOpen);
   
   var result=fp.show();
   if(result==0 && fp.file) {
      //@2do check if it's possible, to check the file (really a WAV file)
      var fullpath=fp.file.path;
      var filename=common.basename(fullpath);
      
      var menuitem=document.getElementById('taskTimer-options'+((type==='start') ? 'Start' : 'End')+'SoundCustom');
      if(menuitem.label.match(/\(.*\)$/)) {
        menuitem.label=menuitem.label.replace(/\(.*\)$/, "("+filename+")");
      }
      else {
        menuitem.label+=" ("+filename+")";
      }
      menuitem.value="custom: "+fullpath;
   }
   else {
      var idOfSelectBox='taskTimer-options'+((type==='start') ? 'Start' : 'End')+'Sound';
      document.getElementById(idOfSelectBox).value=fallbackValue;
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
         idOfSelectBox="taskTimer-optionsStartSound";
         previewButton=btnPreviewStartSound;
      }
      else
      {
         idOfSelectBox="taskTimer-optionsEndSound";
         previewButton=btnPreviewEndSound;
      }
       
      var selectBoxValue=document.getElementById(idOfSelectBox).value;
      if(selectBoxValue==="none")
      {
         previewButton.setAttribute("disabled",true);
      }
      else
      {
         previewButton.removeAttribute("disabled");
      }
      
      if(type==='start') {
        currentStartSoundValue=selectBoxValue;
      }
      else {
        currentEndSoundValue=selectBoxValue;
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
      var idOfSelectBox=((type==="start")?"taskTimer-optionsStartSound":"taskTimer-optionsEndSound");
      return document.getElementById(idOfSelectBox).value;
   }

   var saveReporting=function()
   {
      var prefs = new Array();
      var chkShowAccumulated=document.getElementById("taskTimer-optionsShowAccumulatedTime");
      var txtAccumSinceTime=document.getElementById("taskTimer-optionsAccumulatedStartTime");
      prefs.showAccumulatedTime = (chkShowAccumulated.getAttribute("checked") ? "true": "false");
      prefs.showAccumulatedTimeSince = txtAccumSinceTime.value;

      common.setReportingPrefs(prefs);
   }
   
   /**
    * This method bundles all the "writing alerts to stored preferences"-stuff.
    **/
   var saveAlerts=function()
   {
      var popupValue=document.getElementById("taskTimer-optionsPopupAlert").getAttribute("checked");
      popupValue=(popupValue==="true")?true:false;
      common.setAlert("popup",popupValue);
       
      var statusbarValue=document.getElementById("taskTimer-optionsStatusbarAlert").getAttribute("checked");
      statusbarValue=(statusbarValue==="true")?true:false;
      common.setAlert("statusbar",statusbarValue);
       
      var widgetValue=document.getElementById("taskTimer-optionsWidgetAlert").getAttribute("checked");
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
}

var taskTimerOptionsWindowInstance=new taskTimerOptionsWindow();
window.addEventListener("load",taskTimerOptionsWindowInstance.init,false);

