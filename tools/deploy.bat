@REM don't watch the sausage being made
@ECHO OFF

REM the folder this script is in (*/bootplate/tools)
SET TOOLS=%~DP0

REM enyo location
SET ENYO=%TOOLS%\..\enyo

REM deploy script location
SET DEPLOY=%ENYO%\tools\deploy.js

REM node location
SET NODE=node.exe

REM use node to invoke deploy.js with imported parameters
%NODE% "%DEPLOY%" %*

if not "%1" == "" (

    if "%1" == "--chrome" (
        rem I don't know how to write batch scripts, but this works.
    	:setBase
    	SET BASE=%~dp0..\
    	if [%BASE%] == [] goto setBase

    	:setDest
    	SET DEST=%BASE%deploy\Trakkit
    	if [%DEST%] == [] goto setDest
    	rem echo. Dest: %DEST%

    	:setChrome
    	SET CHROME=%BASE%extension
    	if [%CHROME%] == [] goto setChrome
    	rem echo. Chrome: %CHROME%

    	xcopy %CHROME% %DEST% /e /q
	)

)
