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

function taskTimerTaskDB()
{
   var self=this;

   const common=new taskTimerCommon();
   const storedPrefs=Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
   const taskDB=storedPrefs.getBranch("extensions.tasktimer.tasks.");
   const sqldb = new SQLite("tasktimer.sqlite", {location:'ProfD'});
    
   /**
    * This method generates a basic preconfigured task database.
    **/
   this.initTaskDB=function()
   {
      //common.log("taskTimer","Initiating Task Database\n");
      /* tasks:
       *    id:    An ID for the project
       *    name:  The name of the project
       *    hidden:  Whether or not this task should be hidden
       */
      sqldb.execute("CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, name STRING, hidden INTEGER, active INTEGER)");
      
      /* worktimes:
       *    time:        An integer value representing time since 1/1/1970 00:00:00 in seconds (Unix style type)
       *    start/stop:  An integer representing whether or not this entry was to start working or to stop working.
       *    taskid:       Which project ID this entry is for.
       */
      sqldb.execute("CREATE TABLE IF NOT EXISTS worktimes (time INTEGER, taskid INTEGER, note STRING)");       

      //TODO: this is not very reliable, make this better.  Somehow I want to ENSURE that id #1 is the idle task.
      var tasks = sqldb.execute("SELECT * from tasks");
      if ((tasks.length == 0) || (tasks == null) || (tasks == 0)) {
         sqldb.execute(sprintf("INSERT INTO tasks (name, active, hidden) VALUES ('%s', %d, %d)", 'Idle', 0, 0));
         alert('First run: Database is initialized!');
      }
      
      //Alter tables if column doesn't exist
      var worktimes_note = 0;

      var info = sqldb.execute("PRAGMA table_info(worktimes)");
      for (var i=0; i<info.length; i++) {
         //Application.console.log(common.dumpObject(info[i]));
         if (info[i].name == "note") {
            worktimes_note = 1;
         }
      }

      if (worktimes_note == 0) {
         sqldb.execute("ALTER TABLE worktimes ADD COLUMN note STRING");
      }
   }
	
    /**
     * This method counts the number of available tasks in the database.
     * @returns integer number of tasks
     **/
    this.getNumberOfTasks=function()
    {
       //TODO: FIXME, not sure what this should do but we won't have much of a limitation with sqlite :)
       return 100;
    }
    
    /**
     * This private method checks if a certain task is marked for deletion (hidden).
     * @param integer taskID
     * @return bool hidden oder not?
     * @throws taskTimerInvalidTaskIDException
     **/
    var checkIfTaskIsHidden=function(id)
    {
       var result = sqldb.execute(sprintf("SELECT hidden FROM tasks WHERE id=%d", id));
       return (result["hidden"] == 1? true : false);
    }
    
    /**
     * This public method adds a task to the DB.
     * @param string taskName
     * @param integer taskTime (in seconds)
     * @param boolean mark task as active task?
     * @returns integer new taskID
     * @throws taskTimerDBInsufficientInputDataException
     **/
    this.addTask=function(name,time,checked)
    {
       sqldb.execute(sprintf("INSERT INTO tasks (name, active, hidden) VALUES('%s', %d, %d)", name, (checked ? 1 : 0), 0));
    }
    
    /**
     * This public method lets you set the name of a certain existing task.
     * @param integer taskID
     * @param string newName
     * @throws taskTimerInvalidTaskIDException
     * @throws taskTimerInvalidTaskNameException
     **/
    this.setName=function(id,name)
    {
        if(self.checkTaskWithID(id)===false)
        {
            throw new taskTimerInvalidTaskIDException("setName: Invalid call, first parameter must be a task ID.");
        }
        
        if(!(typeof name==="string" && name.length>0))
        {
            throw new taskTimerInvalidTaskNameException("setName: Invalid call, second parameter must be a valid name.");
        }
        
        taskDB.setCharPref(id+".name",name);
    }
    
    /**
     * This public method lets you set the time of a certain existing task.
     * @param integer taskID
     * @param integer new time (in seconds)
     * @throws taskTimerInvalidTaskIDException
     * @throws taskTimerInvalidTaskTimeException
     **/
    this.setTime=function(id,time)
    {
        if(self.checkTaskWithID(id)===false)
        {
            throw new taskTimerInvalidTaskIDException("setTime: Invalid call, first parameter must be a task ID.");
        }
        
        if(!(typeof time==="number" && parseInt(time,10)>0))
        {
            throw new taskTimerInvalidTaskTimeException("setTime: Invalid call, second parameter must be a time integer greater than 0.");
        }
        
        taskDB.setIntPref(id+".time",parseInt(time,10));
    }
    
     /**
     * This public method sets a certain existing task for deletion (hidden).
     * @param integer taskID
     * @throws taskTimerInvalidTaskIDException
     **/
    this.setHidden=function(id)
    {
	if(self.checkTaskWithID(id)===false)
        {
            throw new taskTimerInvalidTaskIDException("setHidden: Invalid call, first parameter must be a task ID.");
        }
        
        taskDB.setBoolPref(id+".hidden",true);
    }
    
    /**
     * This public method finally deletes a certain task.
     * It does not check, if the task was marked as "hidden" before!
     * @param integer taskID
     * @throws taskTimerInvalidTaskIDException
     **/
    this.deleteTask=function(id)
    {
        if(self.checkTaskWithID(id)===false)
        {
            throw new taskTimerInvalidTaskIDException("setTime: Invalid call, first parameter must be a task ID.");
        }
        
        taskDB.clearUserPref(id+".name");
        taskDB.clearUserPref(id+".time");
        taskDB.clearUserPref(id+".checked");
		  taskDB.clearUserPref(id+".hidden");
    }
    
    /**
     * You can use this method to check if there's a task with a certain ID.
     *
     * @param integer TaskID2check
     * @returns boolean true or false
     **/
    this.checkTaskWithID=function(id)
    {
  		 var result=false;
       taskids = sqldb.execute(sprintf("SELECT id FROM tasks where id=%d", id));
       if (taskids.length>0)
       {
          result = true
       }
		 return result;
    }
	
    this.getTaskData=function(id)
    {
       //Get all fields of a specific task
       task = sqldb.execute(sprintf("SELECT * FROM tasks WHERE id=%d", id));
       return task;       
    }


    this.getDataOfAllTasks=function(includehidden,sorting)
    {
       //includehidden=((includehidden===true)?true:false);
       //TODO handle includehidden and sorting
       var tasks = sqldb.execute("SELECT * from tasks");
       return tasks;
    }

    this.getTimeWorkedOnTaskInRange=function(id, startsec, endsec)
    {
       var sum = 0;
       var oldtime = 0;
       var records = sqldb.execute(sprintf("SELECT * FROM worktimes WHERE time >= %d AND time <= %d ORDER BY time", startsec, endsec));

       for (var i=0; i<records.length; i++)
       {
          if (records[i].taskid == id)  //this is the task we are interested in
          {
             if (oldtime > 0) {
                //if there are double entries
                sum += (records[i].time - oldtime);
             }
             if (i == (records.length-1)) {
                //this is the last record to process.  If it is the task we are interested in, 
                //also add up until the end time requested
                sum += (endsec - records[i].time)
             }             
             oldtime = records[i].time;
          }
          else  //not the task we are interested in.
          {
             if (oldtime > 0) {
                //we've stopped working on the task
                sum += (records[i].time - oldtime);
                oldtime = 0;
             }
          }
       }
       return sum;  //should be a sum of time worked on this task from start-->end
    }

    /**
     * This method returns the ID of the currently choosen/checked task.
     * @returns integer taskID
     **/
    this.getIdOfCurrentTask=function()
    {
       var id = 1;  //when in doubt, always task 1 which is idle or non-working time.
       var result = sqldb.execute("SELECT id FROM tasks WHERE active=1 AND hidden=0");
       if (result.length>0)
       {
		    id = result[0].id;
       }
       return id;
    }

    this.getNameOfCurrentTask=function()
    {
       var name = "ERROR: Unknown!"
       var result = sqldb.execute("SELECT name FROM tasks WHERE active=1 AND hidden=0");
       if (result.length>0)
       {
		    name = result[0].name;
       }
       return name;
    }

    this.getMostRecentTask=function()
    {
       //get the most recent task that is less or equal to the time right now
       var stat = 0;
       var result = sqldb.execute( sprintf("SELECT MAX(time) AS time, taskid FROM worktimes WHERE time <= %d", (new Date().getTime()/1000)) );
       if (result.length > 0) {
          stat = result[0].taskid;
       }
       return stat;
    }

    //this function is private
    var makeWorkEntry=function(id, time, note, force_entry)
    {
       //only add an entry if it is different from the most recent one, 
       //we don't need double entries
       if ( (id != self.getMostRecentTask()) || (force_entry == true) ) {
          sqldb.execute(sprintf("INSERT INTO worktimes (taskid, time, note) VALUES(%s, %s, '%s')", id, parseInt(time), note));
       }
    }

    this.startWorkingOnTask=function(id, time, note, force_entry)
    {
       if (typeof(note) === 'undefined') {
          note = "";
       }
       if (typeof(force_entry) === 'undefined') {
          force_entry = false;
       }
       makeWorkEntry(id, time, note, force_entry);
    }

    /**
     * This method returns an array with all available task IDs.
     * @param bool includehidden (include hidden tasks also)
     * @param string sorting (id, name ASC, name DESC, time ASC, time DESC)
     * @returns array taskIDs
     **/
    this.getIDsOfTasks=function(includehidden,sorting)
    {
		includehidden=((includehidden===true)?true:false);
		try
		{
			common.validateSortingOrder(sorting);
		}
		catch(e)
		{
			sorting="id";
		}
		
		var tasks=new Array();
		var numberOfTasks=self.getNumberOfTasks();
        const offset=23;
        var end=offset;
		for(var i=1; i<=end; i++)
		{
			if(self.checkTaskWithID(i))
			{
				if(
				   (includehidden===false && self.getTaskData(i)["hidden"]===false) ||
				   (includehidden===true)
				)
				{
					tasks.push(i);
					end=i+offset;
				}
			}
	    
			if(tasks.length-1===numberOfTasks)
			{
				break;
			}
		}
		
		if(sorting!=="id")
		{
			try
			{
				var stop=true;
				do
				{
					stop=true;
					for(i=0; i<tasks.length-1; i++)
					{
						var thisTask=self.getTaskData(tasks[i]);
						var nextTask=self.getTaskData(tasks[i+1]);
						if(
							(sorting==="time ASC" && thisTask.time>nextTask.time) ||
							(sorting==="time DESC" && thisTask.time<nextTask.time) ||
							(sorting==="name ASC" && thisTask.name>nextTask.name) ||
							(sorting==="name DESC" && thisTask.name<nextTask.name)
						)
						{
							tmp=tasks[i];
							tasks[i]=tasks[i+1];
							tasks[i+1]=tmp;
							stop=false;
						}
					}
				}
				while(stop===false);
			}
			catch(e)
			{
				//if there was an error, ignore it, because it's better to return a wrong sorted list instaskd of failing at all.
			}
		}
	
		return tasks;
    }
    
    /**
     * This method returns an array with all task IDs of tasks, that are marked for deletion (hidden).
     * @returns array taskIDs
     **/
    this.getIDsOfHiddenTasks=function()
    {
        var tasks=self.getIDsOfTasks(true);
        var hiddenTasks=new Array();
        for(var i=0; i<tasks.length; i++)
        {
            var taskID=tasks[i];
            if(self.getTaskData(taskID)["hidden"]===true)
            {
                hiddenTasks.push(taskID);
            }
        }
        
        return hiddenTasks;
	
    }
    /**
     * Use this method to tell the database, that a certain task is choosen.
     * The corresponding flag is set in the database for all tasks.
     *
     * @param integer taskID
     * @throws taskTimerInvalidTaskIDException
     **/
    this.setTaskChecked=function(id)
    {
       sqldb.execute("UPDATE tasks SET active=0");  //deactivate all tasks
       sqldb.execute(sprintf("UPDATE tasks SET active=%d WHERE id=%d", 1, id));
    }
}

function taskTimerInvalidTaskIDException(msg)
{
    this.name="taskTimerInvalidTaskIDException";
    this.message=((msg===undefined)?null:msg);
}

function taskTimerInvalidTaskTimeException(msg)
{
    this.name="taskTimerInvalidTaskTimeException";
    this.message=((msg===undefined)?null:msg);
}

