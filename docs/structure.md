# Structure of local log storage Local 

Log files should be stored in a file structure reflecting company, environment, date and log type.

For example:

    ABC_CORP/+
    XYZ_CORP/
      Meta/
        LogData.json
      Environments/
        UAT/
          cursors.json
          2023/+
          2024/
            05-01/
              ErrorLog.txt
              AccessLog.txt
              8000_ErrorLog.txt
              9001_ErrorLog.txt
            05-02/
              ErrorLog.txt
              AccessLog.txt
              8000_ErrorLog.txt
              9001_ErrorLog.txt
            05-03~TODAY/
              ErrorLog.txt
        PRD/
          2023/+
          2024/+


## How this should work:

In a project folder, it should create a top-level mllogs folder with a subfolder for each environmet found in a gradle properties file.
When the user runs mllggr --env foo, it should take the environment from gradle.properties and use them to connect.
