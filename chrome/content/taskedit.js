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

function taskTimerEditTaskWindow()
{
   var self=this;

   var taskDB=new taskTimerTaskDB();
   var taskID=null;
   const common=new taskTimerCommon();

   /* GUI elements */
   var txtTaskName = null;
   var txtProjectCode = null;
   var txtDescription = null;
   var chkHidden = null;
   var btnOK = null;
   var btnCancel = null;

   this.init=function()
   {
      /* The taskID should have been passed as an argument to open this window */
      taskID = Number(window.arguments[0]);

      /* init GUI elements */
      txtTaskName = document.getElementById("taskprops-txtTaskName");
      txtProjectCode = document.getElementById("taskprops-txtProjectCode");
      txtDescription = document.getElementById("taskprops-txtDescription");
      chkHidden = document.getElementById("taskprops-chkHidden");
      btnOK = document.getElementById("taskprops-btnOK");
      btnCancel = document.getElementById("taskprops-btnCancel");

      /* wire up GUI elements */
      btnOK.addEventListener("command", taskTimerEditTaskWindowInstance.okButtonCommand, false);
      btnCancel.addEventListener("command", taskTimerEditTaskWindowInstance.cancelButtonCommand, false);

      /* query DB for this task ID */
      var result = taskDB.getTaskData(taskID);

      /* populate form with result */
      txtTaskName.value = result.name;
      txtProjectCode.value = result.projectcode;
      txtDescription.value = result.desc;
      chkHidden.value = result.hidden;
   }

   this.okButtonCommand=function() 
   {
      /* write fields to database */
      taskDB.updateTask(taskID, "name", txtTaskName.value);
      taskDB.updateTask(taskID, "projectcode", txtProjectCode.value);
      taskDB.updateTask(taskID, "desc", txtDescription.value);
      taskDB.updateTask(taskID, "hidden", chkHidden.value);
      window.close();
   }

   this.cancelButtonCommand=function()
   {
      window.close();
   }


}

var taskTimerEditTaskWindowInstance=new taskTimerEditTaskWindow();
window.addEventListener("load",taskTimerEditTaskWindowInstance.init,false);

