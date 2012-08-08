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

function taskReadyDialog()
{
	const common=new taskTimerCommon();
	this.init=function()
	{
		var tasknameline=document.getElementById('tasknameline');
		tasknameline.firstChild.data=tasknameline.firstChild.data.replace('{$TASKNAME}',window.arguments[0]);
		tasknameline.firstChild.data=tasknameline.firstChild.data.replace('\\n',"\n");
		var messageline=document.getElementById('messageline');
		messageline.firstChild.data=messageline.firstChild.data.replace('\\n',"\n");
		
		if(window.arguments[1]===true)
		{
			var descEl=document.createElement("description");
			descEl.setAttribute("id","websitewidgeterrorline");
			descEl.setAttribute("value",common.getString("taskready.widgetErrorMsg"));
			document.getElementById("wrapper").appendChild(descEl);
		}
	}
}

var taskTimerReadyDialog=new taskReadyDialog();
window.addEventListener("load",taskTimerReadyDialog.init,false);
