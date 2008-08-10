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

function teaReadyDialog()
{
	const common=new teaTimerCommon();
	this.init=function()
	{
		var el=document.getElementById('teanameline');
		el.setAttribute('value',el.getAttribute('value').replace('{$TEANAME}',window.arguments[0]));
		
		if(window.arguments[1]===true)
		{
			var descEl=document.createElement("description");
			descEl.setAttribute("id","websitewidgeterrorline");
			descEl.setAttribute("value",common.getString("teaready.widgetErrorMsg"));
			document.getElementById("wrapper").appendChild(descEl);
		}
	}
}

var teaTimerReadyDialog=new teaReadyDialog();
window.addEventListener("load",teaTimerReadyDialog.init,false);