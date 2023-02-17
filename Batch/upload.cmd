@echo on

REM
REM Add -x 127.0.0.1:8888 for fiddler debugging
REM
REM TODO: make myfile.json an input variable.  For now make sure myfile.json is in same path as
REM this batch file.
REM curl -X POST -H "Content-Type: application/json" --data @tempfiles/packageManifest.json "http://dmtdev.itportal.sentara.com:7070/api/package" 
curl -X POST -H "Content-Type: application/json" --data @tempfiles/packageManifest.json "http://LT8V8T9Y2:7070/api/package" 