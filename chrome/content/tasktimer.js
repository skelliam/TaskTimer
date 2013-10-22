function taskTimer()
{
    var taskDB=new taskTimerTaskDB();
    const thisClassName="taskTimer"; // needed in debug output
    const common=new taskTimerCommon();
    
    var tasktimerBox=null; //container for tasktimer-box (box)
    var tasktimerCountdownBox=null; //container for 'tasktimer-countdownbox' (box; wraps tasktimer-countdown)
    var tasktimerCountdown=null; //container for XUL element reference  to 'tasktimer-countdown' (label)
    var tasktimerToolbarbutton=null; //main toolbarbutton containing the former contextmenu
    var tasktimerContextMenu=document.getElementById("tasktimer-contextMenu");
    var tasktimerViewModeIconAndTime=null; //container for view mode icon and text menuitem
    var tasktimerViewModeIconOnly=null; //container for view mode icon only menuitem
    const sound=Components.classes["@mozilla.org/sound;1"].createInstance().QueryInterface(Components.interfaces.nsISound);
    
    var self=this;
    var timerInterval=null; //container for the countdown interval ressource
    var statusbarAlertInterval=null; //container for the statusbar alert ('blink-blink') interval ressource
    var startingTSofCurrentCountdown=null;
    var timerInProgress=false; //flag
    var idOfCurrentSteepingTask=null;
    var uninstallFlag=false; //this flag is set to true, if the extension is going to be uninstalled when browser is closed
    const uninstObserver=Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
    
    var appInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
    var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"].getService(Components.interfaces.nsIVersionComparator);
    
    
    /**
     * The public init method of taskTimer. 
     **/
    this.init=function()
    {
        migrateOldPreferences();
        
        tasktimerBox=document.getElementById("tasktimer-box");
        
        tasktimerCountdownBox=document.getElementById("tasktimer-countdownbox");
        tasktimerCountdownBox.addEventListener("click",taskTimerInstance.countdownAreaClicked,false);

        tasktimerCountdown=document.getElementById("tasktimer-countdown");
        tasktimerToolbarbutton=tasktimerBox.getElementsByTagName("toolbarbutton")[0];
        
        document.getElementById("tasktimer-options").addEventListener("command",taskTimerInstance.openOptionsWindow,false);
        document.getElementById("tasktimer-quicktimer").addEventListener("command",taskTimerInstance.quicktimerMenuitemCommand,false);
        document.getElementById("tasktimer-cancel").addEventListener("command",taskTimerInstance.cancelTimer,false);
        document.getElementById("tasktimer-test").addEventListener("command", taskTimerInstance.testFunction, false);
        
        taskDB.initTaskDB();
        
        tasktimerContextMenu=document.getElementById("tasktimer-contextMenu");
        tasktimerContextMenu.addEventListener("popupshowing",taskTimerInstance.prepareTaskSelectMenu,false);
        
        tasktimerViewModeIconAndTime=document.getElementById("tasktimer-showModeIconAndTime");
        tasktimerViewModeIconOnly=document.getElementById("tasktimer-showModeIconOnly");
        
        if(common.getViewMode()==="iconOnly")
        {
            tasktimerViewModeIconAndTime.setAttribute("checked","false");
            tasktimerViewModeIconOnly.setAttribute("checked","true");
        }
        else
        {
            tasktimerViewModeIconAndTime.setAttribute("checked","true");
            tasktimerViewModeIconOnly.setAttribute("checked","false");
        }
        
        renderViewMode();

        tasktimerViewModeIconAndTime.addEventListener("command",taskTimerInstance.viewModeChanged,false);
        tasktimerViewModeIconOnly.addEventListener("command",taskTimerInstance.viewModeChanged,false);
        
        resetCounter();
        
        uninstObserver.addObserver(self,"em-action-requested",false);
        uninstObserver.addObserver(self,"quit-application-granted",false);

        self.startCounting();
        
    }
    
    /*
        ==============
        | UI methods |
        ==============
    */

    this.testFunction=function()
    {
       var DAYSBACK = 60;  //start report by looking back this many days
       var STARTTIME = 7;  //report each day from this time
       var HOURSFWD = 15;  //look forward this many hours from start time

       var win = Components.classes['@mozilla.org/appshell/window-mediator;1']
                     .getService(Components.interfaces.nsIWindowMediator)
                     .getMostRecentWindow('navigator:browser');
       win.gBrowser.selectedTab = win.gBrowser.addTab("chrome://tasktimer/content/summary.html");
       var newTabBrowser = win.gBrowser.getBrowserForTab(win.gBrowser.selectedTab);


       var makeSVG = function() {
          var tag = arguments[0];
          var attrs = arguments[1];
          var el= newTabBrowser.contentDocument.createElementNS('http://www.w3.org/2000/svg', tag);
          for (var k in attrs)
              if (attrs.hasOwnProperty(k)) el.setAttribute(k, attrs[k]);
          return el;
       };

       var drawArcs = function () {
          var paper = arguments[0];
          var pieData = arguments[1];
          var total = pieData.reduce(function (accu, that) { return that + accu; }, 0);
          var sectorAngleArr = pieData.map(function (v) { return 360 * v / total; });

          var startAngle = 0;
          var endAngle = 0;
          for (var i=0; i<sectorAngleArr.length; i++){
              startAngle = endAngle;
              endAngle = startAngle + sectorAngleArr[i];

              var x1,x2,y1,y2 ;

              x1 = parseInt(Math.round(200 + 195*Math.cos(Math.PI*startAngle/180)));
              y1 = parseInt(Math.round(200 + 195*Math.sin(Math.PI*startAngle/180)));

              x2 = parseInt(Math.round(200 + 195*Math.cos(Math.PI*endAngle/180)));
              y2 = parseInt(Math.round(200 + 195*Math.sin(Math.PI*endAngle/180)));

              var d = "M200,200  L" + x1 + "," + y1 + "  A195,195 0 " + 
                      ((endAngle-startAngle > 180) ? 1 : 0) + ",1 " + x2 + "," + y2 + " z";
              //alert(d); // enable to see coords as they are displayed
              var c = parseInt(i / sectorAngleArr.length * 360);
              var arc = makeSVG("path", {d: d, fill: "hsl(" + c + ", 66%, 50%)"});
              paper.appendChild(arc);
              //arc.onclick = clickHandler; // This is optional, of course
          }
       };

       var loadcallback = function() {
                var tasks = taskDB.getDataOfAllTasks();
                for (var i=1; i<DAYSBACK; i++) {
                   var pieData = [];                 
                   var pieNames = [];  


                   var obj = newTabBrowser.contentDocument.createElement('object');
                   obj.setAttribute("type","image/svg+xml");
                   obj.setAttribute("data", "data:image/svg+xml");

                   var div = newTabBrowser.contentDocument.createElement('div');
                   div.setAttribute("id", "con");     /* container, this is defined in html file */

                   var ul = newTabBrowser.contentDocument.createElement('ul');

                   var svg = newTabBrowser.contentDocument.createElement('svg');
                   svg.setAttribute("width", "200px");
                   svg.setAttribute("height", "200px");
                   svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
                   svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
                   svg.setAttribute("viewbox", "0 0 400 400");

                   var d1 = Date.today()
                              .set({ hour: STARTTIME, minute: 0 })
                              .add({ days: -DAYSBACK+(i+1) });
                   var d2 = d1.clone();

                   d2.addHours(HOURSFWD);
                   div.textContent += "\n------" + (String(d1) + " to " + String(d2) + "\n");

                   /* go thru all tasks */
                   for (var j=0; j<tasks.length; j++) {
                      var id = j+1;  //id 0 is not valid in the database
                      var time = taskDB.getTimeWorkedOnTaskInRange(id, d1.valueOf()/1000, d2.valueOf()/1000);
                      var li = newTabBrowser.contentDocument.createElement('li');  // holds bulletpoint
                      if (time > 0) {
                         //the tasks[] array can hold id 0, so we need to subtract 1 from id
                         li.textContent = String(tasks[id-1].name) + " " + common.getTimeStringFromTime(time) + "\n";
                         ul.appendChild(li);
                         pieData.push(time);
                         pieNames.push(tasks[id-1].name);
                      }
                      div.innerHTML += "</ul>"
                   }
                   //alert(String(pieData));
                   div.appendChild(ul);  //insert list of tasks into div
                   drawArcs(svg, pieData); //generate pie chart
                   obj.innerHTML = '<?xml version="1.0" encoding="utf-8"?>' + svg.outerHTML; //insert svg code into object
                   div.appendChild(obj); //insert chart into div

                   newTabBrowser.contentDocument.body.appendChild(div);  /* plop the div into the document */
                }

       }; /* var loadcallback */

       /* create new tab and populate it using the above callback */
       newTabBrowser.addEventListener("load", loadcallback, true);
    }


    
    /**
     * This public method can be called to regenerate/update the tasks in task timer context menu, based on the current content of the database.
     * It adds the task nodes before the separator with XUL ID tasktimer-endTasklistSeparator
     **/
    this.prepareTaskSelectMenu=function()
    {
        var tasks=taskDB.getDataOfAllTasks(false, common.getSortingOrder());
        var startSeparator=document.getElementById("tasktimer-endViewModeSeparator");
        var endSeparator=document.getElementById("tasktimer-endTasklistSeparator");
        var i=0;

        common.log(tasks);

        while(endSeparator.previousSibling)
        {
            //endless loop prevention
            if ((endSeparator.previousSibling==startSeparator)||(i>100))
            {
                break;
            }
            endSeparator.parentNode.removeChild(endSeparator.previousSibling);
            
            i++;
        }
        
        for(i=0; i<tasks.length; i++)
        {
            var task=tasks[i];
            if (task.hidden != true) 
            {
               var taskNode=document.createElement("menuitem");
               taskNode.setAttribute("name","tasktimer-task");
               taskNode.setAttribute("value",task["id"]);
               taskNode.setAttribute("label",task["name"]);  //this is the label on the context menu
               taskNode.setAttribute("type","radio");
               if(task["active"] != 0)
               {
                   taskNode.setAttribute("checked","true");
               }

               //extract the numeric ID from the menuitem ID which should be something like 'tasktimer-task1"
               taskNode.addEventListener("command", 
                                        function() {
                                                     taskTimerInstance.taskChoosen(parseInt(this.getAttribute("value")));
                                                              
                                                   }
                                        ,false); 
               
               tasktimerContextMenu.insertBefore(taskNode,endSeparator);
            }
        }
    }
    
    /**
     * This event method is called, when a task was choosen from the task context menu.
     * It stops a maybe running countdown, markes the given task as checked in the database and starts the new countdon.
     *
     * @param integer taskID
     * @throws taskTimerInvalidTaskIDException
     **/
    this.taskChoosen=function(id)
    {
        id=parseInt(id);
        //stop the pulse
        window.clearInterval(timerInterval);        
        taskDB.setTaskChecked(id);
        idOfCurrentSteepingTask=null; //reseting maybe set quicktimer flag
        self.setCounter(0);  //start counting from zero
        self.startCounting();
    }
    
    /**
     * This method is called, when the quick timer menu item is acivated (clicked).
     * It opens the quicktimer window.
     **/
    this.quicktimerMenuitemCommand=function()
    {
       alert(common.getTimeSec());
       //window.openDialog("chrome://tasktimer/content/quicktimer.xul","","centerscreen,dialog,modal,resizable,scrollbars,dependent");
    }
    
    /**
     * This method is called, when the options menu item is acivated (clicked).
     * It opens the options window.
     **/
    this.openOptionsWindow=function()
    {
        window.openDialog("chrome://tasktimer/content/options.xul","","centerscreen,dialog,modal,resizable,scrollbars,dependent");
    }
    
    /**
     * This public method is called when the user clicks in the taskTimer statusbar panel.
     * @param object mouseEvent
     **/
    this.countdownAreaClicked=function(mouseEvent)
    {
        if(mouseEvent.button===0) //left click
        {
            if(timerInProgress===true)
            {
                self.stopCounting();  
            }
            else
            {
                self.startCounting();
            }
        }
    }
    
    /**
     * This public method is called, when the view mode is changed from icon only mode to icon and text mode or vice versa
     **/
    this.viewModeChanged=function()
    {
        var viewMode=(tasktimerViewModeIconAndTime.getAttribute("checked"))?"timeAndIcon":"iconOnly";
        common.setViewMode(viewMode);
        renderViewMode();
    }
    
    /**
     * This method changes the UI according to the current set view mode.
     **/
    var renderViewMode=function()
    {
        if(tasktimerViewModeIconAndTime.getAttribute("checked")==="true")
        {
            common.removeCSSClass(tasktimerBox,"iconOnlyView");
        }
        else
        {
            common.addCSSClass(tasktimerBox,"iconOnlyView");
        }
    }
    
    
    /*
        =================
        | Timer methods |
        =================
    */
    
    /**
     * This public method can be used to set a countdown.
     * @param integer time in seconds
     **/
    this.setCounter=function(time)
    {
        time=parseInt(time);
        tasktimerCountdown.setAttribute("value", common.getTimeStringFromTime(time));
    }

    //This function will update the startingTSofCurrentCountdown value, which is what the timer uses as a starting point.
    this.refreshStartTime=function()
    {
        //This is the time that the counter was started.  This time is also stored in the database.
        startingTSofCurrentCountdown=common.getTimeSec()

        //Now this is a little tricky -- I want to fake out the timer.  If the user wants an 
        //accumulated time, I want to figure out how much time he has logged on the task so far, and
        //then offset the time by that much.
        var prefs = common.getReportingPrefs();
        if (prefs.showAccumulatedTime == true) {
           var timesince = Date.parse(prefs.showAccumulatedTimeSince);
           if (timesince == null) {
              alert("The setting to show accumulated time is turned on, but there is no time value entered!\n  Setting default 8:00.");
              prefs.showAccumulatedTimeSince = "8:00";
              common.setReportingPrefs(prefs);  /* store the values in the db */
           }
           var timeontask = taskDB.getTimeWorkedOnTaskInRange(idOfCurrentSteepingTask, timesince.getTime()/1000, common.getTimeSec());
           startingTSofCurrentCountdown -= timeontask;  //offset 
        }
    }
    
    /**
     * This public method starts the countdown for the currently choosen task.
     **/
    this.startCounting=function()
    {
        self.cancelStatusbarAlert(); //maybe the statusbar alert ('blink-blink') is still on, so we have to cancel it       
        timerInProgress=true;

        //the id 
        idOfCurrentSteepingTask=taskDB.getIdOfCurrentTask();

        //Setting tootip text
        common.log(common.getString("tasktimer.currentlyWorking"));
        var tooltipText=sprintf(common.getString("tasktimer.currentlyWorking"), taskDB.getNameOfCurrentTask());
        tasktimerCountdownBox.setAttribute("tooltiptext", tooltipText);

        //Setting tootip icon
        var taskicon = taskDB.getIconOfCurrentTask();
        if (taskicon != 0) 
            tasktimerToolbarbutton.setAttribute("image", "data:image/png;base64," + taskDB.getIconOfCurrentTask());
        else
            tasktimerToolbarbutton.setAttribute("image", "chrome://tasktimer/skin/bulldozer_24.png");

        //refresh the start time the timer uses
        self.refreshStartTime();

        //start working on the task, which means store an entry to it in the DB
        taskDB.startWorkingOnTask(idOfCurrentSteepingTask, common.getTimeSec());
       
        //Set timer interval 
        timerInterval=window.setInterval(taskTimerInstance.pulse,1000);
       
    }
    
    /**
     * Use this public mehtod to cancel a currently running timer.
     **/
    this.cancelTimer=function()
    {
        if(timerInProgress)
        {
            self.stopCounting();
        }
        
        self.cancelStatusbarAlert(); //maybe the statusbar alert ('blink-blink') is still on, so we have to cancel it       
        
        resetCounter();
    }
    
    /**
     * This public method sets the quick timer mode to on and must be called when a quick timer countdown was called.
     **/
    this.setQuickTimerMode=function()
    {
        idOfCurrentSteepingTask="quicktimer";
    }
    
    /**
     * This public method reloads the countdown in the statusbar.
     * Included is a complete re-establishment of all events and styles of the countdownArea.
     *
     * @param boolean resetCounter time, too?
     **/
    this.reloadCountdown=function(reset)
    {
        reset=(reset===false)?false:true;
        self.cancelStatusbarAlert(); //maybe the statusbar alert ('blink-blink') is still on, so we have to cancel it
        common.removeCSSClass(tasktimerBox,"finished");
        if(reset)
        {
            resetCounter();
        }
        tasktimerCountdownBox.removeEventListener("click",taskTimerInstance.reloadCountdown,false);
        tasktimerCountdownBox.addEventListener("click",taskTimerInstance.countdownAreaClicked,false);
    }

    this.setIdleState=function(arg) {
       if (arg == true) {
          tasktimerViewModeIconAndTime.setAttribute("checked", "false");
          tasktimerToolbarbutton.setAttribute("image", "chrome://tasktimer/skin/bulldozer_24_inactive.png");
          self.viewModeChanged();
       }
       else {
          tasktimerViewModeIconAndTime.setAttribute("checked", "true");
          var taskicon = taskDB.getIconOfCurrentTask();
          if (taskicon != 0) 
             tasktimerToolbarbutton.setAttribute("image", "data:image/png;base64," + taskDB.getIconOfCurrentTask());
          else
             tasktimerToolbarbutton.setAttribute("image", "chrome://tasktimer/skin/bulldozer_24.png");

          self.viewModeChanged();
       }
    }
   
    
    /**
     * This public method should be called every time, when the countdown 'beats' and does everything, that should be done in every interval cycle
     **/
    this.pulse=function()
    {
        //current time - the start time = delta time
        var difference = common.getTimeSec() - startingTSofCurrentCountdown;

        //update local variable
        var currentTime = parseInt(difference);

        //setting tooltip
        var tooltipText=sprintf(common.getString("tasktimer.currentlyWorking"), taskDB.getNameOfCurrentTask());
        tasktimerCountdownBox.setAttribute("tooltiptext", tooltipText);

        //show 'disabled' state if Idle task is selected
        if (taskDB.getIdOfCurrentTask() == 1) {
           self.setIdleState(true);
        }
        else {
           self.setIdleState(false);
        }

        //update class variable
        self.setCounter(currentTime); 
    }

 
    /**
     * This public method stops the current count down.
     * Please note, that it does no reset of it, so you may call resetCounter after calling this method.
     **/
    this.stopCounting=function()
    {
        //stop the pulse
        window.clearInterval(timerInterval);

        //zero the current starttime 
        startingTSofCurrentCountdown=null;
        timerInProgress=false;
        
        if (taskDB.getIdOfCurrentTask() != 1) {
           //stop working (start working on idle task)
           taskDB.startWorkingOnTask(1, common.getTimeSec());
        }   

        //change statusbar icon
        tasktimerToolbarbutton.setAttribute("image", "chrome://tasktimer/skin/bulldozer_24_inactive.png");

        //remove the click listener?  why?  FIXME
        tasktimerCountdownBox.addEventListener("click",taskTimerInstance.countdownAreaClicked,false);
    }
    
    /**
     * This method is called, when the countdown is done.
     * It stops the countdown, raises the alerts and handles events for the countdown area.
     **/
    var brewingComplete=function()
    {
        self.stopCounting();
        tasktimerCountdown.setAttribute("value",common.getString("tasktimer.taskReady"));
        common.addCSSClass(tasktimerBox,"finished");
        tasktimerCountdownBox.setAttribute("tooltiptext", common.getString("tasktimer.taskReadyAndReload"));
        shootAlerts();
        idOfCurrentSteepingTask=startingTSofCurrentCountdown=null;
        if(common.isAlertDesired("statusbar")===false && common.getViewMode()==="iconOnly")
        {
            self.reloadCountdown();
        }
        else
        {
            tasktimerCountdownBox.removeEventListener("click",taskTimerInstance.countdownAreaClicked,false);
            tasktimerCountdownBox.addEventListener("dblclick",taskTimerInstance.stopCounting,false); //special treament of double clicks, otherwise the next countdown would be started immediately, because the normal click event will be raised to. We don't want that. That's why we stop the countdown right after that.
            tasktimerCountdownBox.addEventListener("click",taskTimerInstance.reloadCountdown,false);
        }
    }
    
    /**
     * @returns integer the currentdown time in seconds
     **/
    var getCurrentCountdownTime=function()
    {
        return common.getTimeFromTimeString(tasktimerCountdown.getAttribute("value"));
    }
    
    
    /**
     * This private method resets the countdown to the value of the currently choosen task.
     **/
    var resetCounter=function()
    {
        tasktimerCountdownBox.setAttribute("tooltiptext", common.getString("tasktimer.clickHereToStart"));
        self.setCounter(0);
    }
    
    
    
    /*
        =================
        | Alert methods |
        =================
    */
    
    
    /**
     * This method fires all alerts.
     **/
    var shootAlerts=function()
    {
        
        if(common.isAlertDesired("statusbar"))
        {
            doStatusbarAlert();
        }
        
        if(common.isAlertDesired("widget"))
        {
            try
            {
                doWidgetAlert();
            }
            catch(e)
            {
                //if websiteWidgetAlert fails and no other alert is active, do anyhow a popupalert. It's better than having no alert at all.
                if(!common.isAlertDesired("statusbar") && !common.isAlertDesired("popup") && common.getIdOfEndSound()==="none")
                {
                    doPopupAlert(true);
                }
            }
        }
        
        if(common.isAlertDesired("popup"))
        {
            doPopupAlert();
        }
    }
    
    /**
     * This method generates and fires the 'task-ready'-popup.
     **/
    var doPopupAlert=function(callBecauseOfWidgetError)
    {
        callBecauseOfWidgetError=((callBecauseOfWidgetError===true)?true:false);
        var taskName=null;
        if(idOfCurrentSteepingTask==="quicktimer")
        {
            taskName=common.getString("tasktimer.readyMessageTaskNameQuickTimer");
        }
        else
        {
            taskName=taskDB.getTaskData(idOfCurrentSteepingTask)["name"];
        }
        window.openDialog("chrome://tasktimer/content/taskReadyDialog.xul","","centerscreen,dialog,resizable,dependent,minimizable=no",taskName,callBecauseOfWidgetError);
    }
    
    /**
     * This method generates and fires the 'task-ready'-statusbar-alert.
     **/
    var doStatusbarAlert=function()
    {
        tasktimerCountdownBox.setAttribute("tooltiptext", common.getString("tasktimer.taskReadyAndCancelAlert"));
        
        common.addCSSClass(tasktimerBox,"readyAlert");
        statusbarAlertInterval=window.setInterval(taskTimerInstance.toggleStatusbarAlertStyle,400);
        if(common.getViewMode()==='iconOnly') {
            tasktimerToolbarbutton.addEventListener('click', self.cancelStatusbarAlert, false);
        }
    }
    
    /**
     * This private method generates the widget for the widget alert and places it in the document.
     **/
    var doWidgetAlert=function()
    {
        try
        {
            var req=new XMLHttpRequest();
            req.open("GET","chrome://tasktimer/skin/widgetAlert/default/widget.html",false);
            req.overrideMimeType("text/xml");
            req.send(null);
            if(req.status===0) //status for local requests must be 0, to be okay.
            {
                var wdoc=req.responseXML;
                var widget=wdoc.getElementById("taskTimer-alertWidget");
                var targetWindow=gBrowser.selectedBrowser.contentWindow;
                var targetDoc=gBrowser.selectedBrowser.contentDocument;
                var targetBody=getWebsiteWidgetTargetDoc();
                
                //check if there's already an element with the ID "taskTimer-alertWidget"
                if(targetDoc.getElementById("taskTimer-alertWidget")!==null)
                {
                    //throw new taskTimerAlertWidgetAlreadyInDocumentException("Can't do widget alert, because there's already an element with the ID taskTimer-alertWidget in the document.");
                    self.removeWidgetAlert();
                }
                
                var taskName=null;
                if(idOfCurrentSteepingTask==="quicktimer")
                {
                    taskName=common.getString("tasktimer.readyMessageTaskNameQuickTimer");
                }
                else
                {
                    taskName=taskDB.getTaskData(idOfCurrentSteepingTask)["name"];
                }
                
                var str=common.getStringf("tasktimer.widgetAlert.enjoyYourTaskName",new Array("{TASKNAME}"));
                var strPrefix=str.substr(0,str.indexOf("{TASKNAME}"));
                var strPostfix=str.substr(str.indexOf("{TASKNAME}")+9);
                
                wdoc.getElementById("taskTimer-alertWidgetHeadline").appendChild(wdoc.createTextNode(common.getString("tasktimer.widgetAlert.headline")));
                wdoc.getElementById("taskTimer-alertWidgetCompleteMessage").appendChild(wdoc.createTextNode(common.getString("tasktimer.widgetAlert.steepingComplete")));
                
                var elementTargetMap=[
                        {"source":strPrefix,"target":"taskTimer-alertWidgetEnjoyMessagePrefix"},
                        {"source":taskName,"target":"taskTimer-alertWidgetTaskName"},
                        {"source":strPostfix,"target":"taskTimer-alertWidgetEnjoyMessagePostfix"}
                ]
                
                for(var i=0;i<elementTargetMap.length;i++)
                {
                    var text=elementTargetMap[i].source;
                    var target=elementTargetMap[i].target;
                    if(text.indexOf("\n")>=0)
                    {
                        if(text.indexOf("\n")===0)
                        {
                            wdoc.getElementById(target).appendChild(targetDoc.createElement("br"));
                        }
                        
                        var parts=text.split("\n");
                        for(var p=0; p<parts.length;p++)
                        {
                            wdoc.getElementById(target).appendChild(wdoc.createTextNode(parts[p]));
                            wdoc.getElementById(target).appendChild(targetDoc.createElement("br"));
                        }
                    }
                    else
                    {
                        wdoc.getElementById(target).appendChild(wdoc.createTextNode(text));
                    }
                }
                
                widget.addEventListener("click",taskTimerInstance.removeWidgetAlert,false);
                targetBody.appendChild(widget);
                
                targetBody.parentNode.getElementsByTagName("head")[0].appendChild(generateWebsiteWidgetCSSLink("reset",targetDoc));
                targetBody.parentNode.getElementsByTagName("head")[0].appendChild(generateWebsiteWidgetCSSLink("theme",targetDoc));
                
                var secondsUntilFadeOut=common.getWidgetAlertShowTime();
                if(secondsUntilFadeOut>0)
                {
                    targetWindow.setTimeout(taskTimerInstance.fadeOutWidgetAlert,secondsUntilFadeOut*1000);
                }
            }
        }
        catch(e)
        {
            throw e;
        }
    }
    
    /**
     * This method detects the correct body element of the given document. If the document contains a frameset it will return the body element of the biggest frame.
     * 
     * @param object targetDoc (object HTMLDocument)
     * @returns object targetBody (object HTMLBodyElement)
     **/
    var getWebsiteWidgetTargetDoc=function(doc)
    {
        if(doc===undefined)
        {
            doc=gBrowser.selectedBrowser.contentDocument;
        }
        
        var targetBody=null;
        //check if website uses frames. If yes, try to findest the biggest frame, we will include the widget in it.
        if(doc.getElementsByTagName("frameset").length>0)
        {
            var frames=doc.getElementsByTagName("frameset")[0].getElementsByTagName("frame");
            var biggestFrame=null;
            var biggestFrameSize=null;
            for(var i=0; i<frames.length; i++)
            {
                var currentFrameSize=frames[i].offsetWidth*frames[i].offsetHeight;
                if(currentFrameSize>biggestFrameSize)
                {
                    biggestFrame=i;
                    biggestFrameSize=currentFrameSize;
                }
            }
            
            targetBody=getWebsiteWidgetTargetDoc(frames[biggestFrame].contentDocument);
        }
        else
        {
            targetBody=doc.getElementsByTagName("body")[0];
        }
        
        return targetBody;
    }
    
    /**
     * This method generates a link element that links the website widget reset or theme CSS, depending on type parameter.
     *
     * @param string type ("reset" or "theme")
     * @param object root HTMLDocument element of the link node, that has to be created.
     * @returns object Link DOM Node
     **/
    var generateWebsiteWidgetCSSLink=function(type,targetDoc)
    {
        type=((type==="reset")?"reset":"theme");
        
        var cssLink=targetDoc.createElement("link");
        cssLink.setAttribute("id","taskTimer-alertWidget"+((type==="reset")?"Reset":"Theme")+"CSS");
        cssLink.setAttribute("href","chrome://tasktimer/skin/widgetAlert/"+((type==="reset")?"reset":"default/widget")+".css");
        cssLink.setAttribute("media","all");
        cssLink.setAttribute("rel","stylesheet");
        cssLink.setAttribute("type","text/css");
        
        return cssLink;
    }
    
    /**
     * Once called, this public method decreases the opacity of the taskTimer-alertWidget, until the opacity is 0. Finally it removes the widget.
     **/
    this.fadeOutWidgetAlert=function()
    {
        var targetWindow=gBrowser.selectedBrowser.contentWindow;
        var targetBody=getWebsiteWidgetTargetDoc();
        var targetDoc=targetBody.ownerDocument;
        
        var widget=targetDoc.getElementById("taskTimer-alertWidget");
        if(widget!==null)
        {
            var step=0.2;
            if(widget.style.opacity==="")
            {
                widget.style.opacity=1;
            }

            if(((widget.style.opacity*1)-step)>0)
            {
                widget.style.opacity=((widget.style.opacity*1)-step)+"";
                targetWindow.setTimeout(taskTimerInstance.fadeOutWidgetAlert,80);
            }
            else
            {
                self.removeWidgetAlert();
            }
        }
    }
    
    /**
     * This public method removes all HTML nodes from the document, that are associated with the taskTimer alert widget.
     * Currently these are:
     * - link node with ID 'taskTimer-alertWidgetResetCSS'
     * - link node with ID 'taskTimer-alertWidgetThemeCSS'
     * - div node with ID 'taskTimer-alertWidget'
     **/
    this.removeWidgetAlert=function()
    {
        var targetBody=getWebsiteWidgetTargetDoc();
        var targetDoc=targetBody.ownerDocument;
        var nodesToRemove=new Array("taskTimer-alertWidget","taskTimer-alertWidgetResetCSS","taskTimer-alertWidgetThemeCSS");
        for(var i=0; i<nodesToRemove.length; i++)
        {
            var node=targetDoc.getElementById(nodesToRemove[i]);
            if(node!==null)
            {
                node.parentNode.removeChild(node);
            }
        }
    }
    
    
    /**
     * This method is capable for toggling the correct CSS classes for the 'blinking'-statusbar-alert.
     **/
    this.toggleStatusbarAlertStyle=function()
    {
        if(common.getViewMode()==="iconOnly")
        {
            var image="chrome://tasktimer/skin/bulldozer_24.png";
            if (tasktimerToolbarbutton.getAttribute("image").indexOf('steeping')>-1)
            {
                image="chrome://tasktimer/skin/bulldozer_24_inactive.png";
            }
            tasktimerToolbarbutton.setAttribute("image",image);
        }
        else
        {
            if(tasktimerBox.getAttribute("class").indexOf("invisible")>-1)
            {
                common.removeCSSClass(tasktimerBox,"invisible");
            }
            else
            {
                common.addCSSClass(tasktimerBox,"readyAlert");
                common.addCSSClass(tasktimerBox,"invisible");
            }
        }
    }
    
    /**
     * This method quits the statusbar alert.
     **/
    this.cancelStatusbarAlert=function()
    {
        window.clearInterval(statusbarAlertInterval);
        common.removeCSSClass(tasktimerBox,"readyAlert");
        common.removeCSSClass(tasktimerBox,"invisible");
        common.removeCSSClass(tasktimerBox,"finished");
        tasktimerCountdownBox.removeEventListener("click",taskTimerInstance.reloadCountdown,false);
    }
    
    /**
     * This method was written to migrate preferences stored in "tasktimer."-branch to "extensions.tasktimer"-branch.
     *
     * All preferences, except the taskDB, are migrated without special treatment.
     * The taskDB migration is special: We can't use the taskDB class, so we have to poll for tasks with a certain id. This happens in a loop with a special offset.
     * If there's any problem, the whole taskDB migration proccess will be restarted up to three times.
     **/
    var migrateOldPreferences=function()
    {
        const storedPreferences=Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
        const oldBranch=storedPreferences.getBranch("tasktimer.");
        const newBranch=storedPreferences.getBranch("extensions.tasktimer.");
        
        var childListOfOldBranch=new Object();
        oldBranch.getChildList("",childListOfOldBranch);
        if(childListOfOldBranch.value>0)
        {
            //migrate alert preferences
            var prefs2Migrate= [
                {"pref":"alerts.doPopupAlert","type":"bool"},
                {"pref":"alerts.doStatusbarAlert","type":"bool"},
                {"pref":"alerts.doWidgetAlert","type":"bool"},
                {"pref":"alerts.endSound","type":"string"},
                {"pref":"alerts.startSound","type":"string"},
                {"pref":"alerts.widgetAlertShowTime","type":"integer"}
            ]
            
            for(var i=0; i<prefs2Migrate.length; i++)
            {
                try
                {
                    var value=null;
                    switch(prefs2Migrate[i]["type"])
                    {
                        case "bool":
                            try { value=oldBranch.getBoolPref(prefs2Migrate[i]["pref"]); } catch(e) {}
                            if(typeof value==="boolean") { newBranch.setBoolPref(prefs2Migrate[i]["pref"],value); }
                            break;
                        case "integer":
                            try { value=oldBranch.getIntPref(prefs2Migrate[i]["pref"]); } catch(e) {}
                            if(typeof value==="number") { newBranch.setIntPref(prefs2Migrate[i]["pref"],value); }
                            break;
                        case "string":
                            try { value=oldBranch.getCharPref(prefs2Migrate[i]["pref"]); } catch(e) {}
                            if(typeof value==="string") { newBranch.setCharPref(prefs2Migrate[i]["pref"],value); }
                            break;
                    }
                }
                catch(e)
                {
                    //dump("\n\n-----------\n"+i+" "+prefs2Migrate[i]["type"]+" "+prefs2Migrate[i]["pref"]+" "+value+"\n")
                    //dump(e);
                    common.log("Main class","Error while migrating pref '"+prefs2Migrate[i]["pref"]+"' into new branch.\n");
                }
            }
            
            //migrate tasks
            const offset=23;
            var end=offset;
            
            var tries=3;
            for(var t=0; t<tries; t++)
            {
                var retry=false;
                
                for(var i=1; i<end; i++)
                {
                    var taskExists=false;
                    
                    try
                    {
                        newBranch.setCharPref("tasks."+i+".name",oldBranch.getCharPref("tasks."+i+".name"));
                        taskExists=true;
                    }
                    catch(e)
                    { /* do nothing, it just means, that there was no task with the ID i */ }
                    
                    if(taskExists)
                    {
                        var taskTimeValue=1; //fallback value; 1 second is not very useful, but the user will definitely recognize that he/she has to edit the task steeping time.
                        var taskCheckedValue=false; //fallback value;
                        var taskHiddenValue=false; //fallback value;
                        try { taskTimeValue=oldBranch.getIntPref("tasks."+i+".time"); } catch (e) { retry=true; }
                        try { taskCheckedValue=oldBranch.getBoolPref("tasks."+i+".checked"); } catch (e) { retry=true;}
                        try { taskHiddenValue=oldBranch.getBoolPref("tasks."+i+".hidden"); } catch (e) { retry=true; }
                        
                        try { newBranch.setIntPref("tasks."+i+".time",taskTimeValue); } catch (e) { retry=true; }
                        try { newBranch.setBoolPref("tasks."+i+".checked",taskCheckedValue); } catch (e) { retry=true; }
                        try { newBranch.setBoolPref("tasks."+i+".hidden",taskHiddenValue); } catch (e) { retry=true; }
                        
                        end=i+offset;
                    }
                }
                
                if(!retry)
                {
                    break; //everything was okay.
                }
            }
            
            storedPreferences.getBranch("").deleteBranch("tasktimer.");  
        }
    }
    
    /*
        ==================================
        | Uninstall and clean up methods |
        ==================================
        
        A observer is used to get notified, when the extension is marked for uninstalling.
    */
    
    
    /**
     * This public method will be called every time when a action occurred in the extension/addon-manager.
     * It then detects, if the called action is to uninstall this extension and sets a flag.
     * This method will also be called when the browser is closed and if the flag is set, it does some uninstalling-/cleaning-actions.
     *
     * @param object xpconnect
     * @param string requested action ID
     * @param string requested action value
     * @returns bool true, if everything was okay
     **/
    this.observe=function(subject,actionID,actionValue)
    {
        if(actionID==="em-action-requested")
        {
            subject.QueryInterface(Components.interfaces.nsIUpdateItem);
            if(subject.id==="tasktimer@skelliam.xpi")
            {
                if(actionValue==="item-uninstalled")
                {
                    uninstallFlag=true;
                }
                else if(actionValue==="item-cancel-action")
                {
                    uninstallFlag=false;
                }
            }
        }
        else if(actionID==="quit-application-granted")
        {
            if(uninstallFlag)
            {
                uninstall();
            }
            uninstObserver.removeObserver(self,"em-action-requested");
            uninstObserver.removeObserver(self,"quit-application-granted");
        }
        
        return true;
    }
    
    /**
     * This private method does some cleaning, when the extension is uninstalled.
     **/
    var uninstall=function()
    {
        const storedPrefs=Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
        storedPrefs.deleteBranch("extensions.tasktimer.");
    }
}
    
function taskTimerAlertWidgetAlreadyInDocumentException(msg)
{
    this.name="taskTimerAlertWidgetAlreadyInDocumentException";
    this.message=((msg===undefined)?null:msg);
}

var taskTimerInstance=new taskTimer();
window.addEventListener("load",taskTimerInstance.init,false);
