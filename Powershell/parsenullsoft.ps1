# {
#     _id: ObjectId('63e454cd8196599db511db89'),
#     PackageIdentifier: 'GIMP.GIMP',
#     PackageVersion: '2.10.32',
#     PackageLocale: 'en-us',
#     PackageName: 'GIMP',
#     Publisher: 'GIMP',
#     Description: 'GIMP',
#     License: '',
#     Agreements: [],
#     ShortDescription: 'GIMP',
#     Copyright: '',
#     PrivacyUrl: '',
#     PublisherUrl: '',
#     PublisherSupportUrl: '',
#     Tags: [
#         'GIMP',
#         'gimp',
#         'Gimp'
#     ],
#     Author: '',
#     Installers: [
#         {
#             InstallerIdentifier: '',
#             Architecture: 'x64',
#             InstallerType: 'exe',
#             InstallerUrl: 'https://dmtdev.itportal.sentara.com:7071/api/downloads/gimp-2.10.32-setup-1.exe',
#             InstallerSha256: 'E4410B5695CFC83BC2A33A124E8689A50C942978D0164E77724407D2A5CEFB0D',
#             InstallMode: 'silent',
#             InstallerSwitches: {
#                 Silent: '/VERYSILENT /NORESTART /ALLUSERS'
#             }
#         }
#     ]
# }

####################################################################################################
# Add this type so we can prompt for a save location
# Add-Type -AssemblyName System.Windows.Forms
# $iWin32Code = @"
# using System;
# using System.Windows.Forms;

# public class Win32Window : IWin32Window {
#     public Win32Window(IntPtr handle) {
#         Handle = handle;
#     }

#     public IntPtr Handle { get; private set; }
# }
# "@

# if (-not ([System.Management.Automation.PSTypeName]'Win32Window').Type) {
#     Add-Type -TypeDefinition $iWin32Code -ReferencedAssemblies System.Windows.Forms.dll 
# }

# $dlg=New-Object System.Windows.Forms.SaveFileDialog


$pUrl = "";
$pUrl = Read-Host -Prompt 'Enter Nullsoft package URL';
try {
    Invoke-WebRequest $pUrl -OutFile .\tempfiles\temp.exe;
}
catch {
    <#Do this if a terminating exception happens#>
    Write-Host "";
    Write-Host $_ -ForegroundColor Red;
    Write-Host "Please validate the URI and try again." -ForegroundColor Red;
    Write-Host "`tYou entered:" -ForegroundColor Yellow -BackgroundColor Black;
    Write-Host "`t$($pUrl)" -ForegroundColor Yellow -BackgroundColor Black;
    Write-Host "";
    exit;
}

$filePath = (Get-Location | Select-Object -ExpandProperty "Path") +  "\tempfiles\temp.exe";

$props = get-item $filePath | select-object -Property *;

$packagearch = "0";
do {
    Write-Host "===============================================";
    Write-Host "      Select supported architecture type:";
    Write-Host "";
    Write-Host "            X86: Press 1 for x86";
    Write-Host "            X64: Press 2 for x64";
    Write-Host "===============================================";
    $packagearch = Read-Host -Prompt 'Enter architecture';
} until ($packagearch -eq "1" -or $packagearch -eq "2");

$packagearch = if ($packagearch -eq "1") { "x86" } else { "x64" };

$optionalDescription = Read-Host -Prompt 'Enter optional description text';
$optionalDescription = if($optionalDescription.Trim() -eq "") { "No description available"} else { $optionalDescription }

$optionalShortDescription = Read-Host -Prompt 'Enter optional short description text';
$optionalShortDescription = if($optionalShortDescription.Trim() -eq "") { "No description available"} else { $optionalShortDescription }

$optionalLicense = Read-Host -Prompt "Enter license details";
$optionalLicense = if($optionalLicense.Trim() -eq "") { "No license information available"} else { $optionalLicense }

$optionalAuthor = Read-Host -Prompt "Enter author ($($props.VersionInfo.CompanyName))";
if($optionalAuthor.Trim() -eq "") {
    $optionalAuthor = $props.VersionInfo.CompanyName
}
$optionalSilentInstallString = "";
$optionalSilentInstallString = Read-Host -Prompt 'Enter optional silent install arguments';

$data = @{
    PackageIdentifier = $props.VersionInfo.CompanyName+"."+$props.VersionInfo.ProductName;
    PackageVersion = $props.VersionInfo.FileVersion;
    PackageLocale = if($props.VersionInfo.Language.Contains("English")) { "en-US" } else {  };
    PackageName = $props.VersionInfo.ProductName;
    Publisher = $props.VersionInfo.CompanyName;
    Description = $optionalDescription;
    License = $optionalLicense;
    Agreements = @();
    ShortDescription = $optionalShortDescription;
    Copyright = $props.VersionInfo.LegalCopyright;
    PrivacyUrl = "";
    PublisherUrl = "";
    PublisherSupportUrl = "";
    Tags = @();
    Author = $optionalAuthor;
    Installers = @(
        @{
            Architecture=$packagearch;
            InstallerType= "nullsoft";
            InstallerUrl = $pUrl;
            InstallerSha256 = (Get-FileHash $filePath).Hash;
            InstallMode = "silent";
            InstallerSwitches = @{
                Silent = $optionalSilentInstallString;
            }
        }
    );
};

$json =  $data | ConvertTo-JSON -Depth 100;
Write-Host $json;
$json | Out-File -FilePath .\tempfiles\packageManifest.json -Encoding "utf8"
# $dlg.Filter = "JSON (*.json)|*.json";

# # I don't think this actually works 
# $owner = New-Object Win32Window -ArgumentList ([System.Diagnostics.Process]::GetCurrentProcess().MainWindowHandle)
# if($dlg.ShowDialog($owner) -eq 'Ok'){
#     Write-host "Saving to $($dlg.filename)";
#     $json | Out-File -FilePath $dlg.filename -Encoding "utf8"
# }
Start-Process -FilePath "notepad" -Wait -WindowStyle Maximized -ArgumentList .\tempfiles\packageManifest.json

$doupload = "0";
do {
    Write-Host "===============================================";
    Write-Host "      Select supported architecture type:";
    Write-Host "";
    Write-Host "            1: Press 1 to upload file";
    Write-Host "            Q: Press Q to quit";
    Write-Host "===============================================";
    $doupload = Read-Host -Prompt 'Upload file?';
} until ($doupload -eq "1" -or $doupload.ToUpper() -eq "Q");

if($doupload -eq "1") {
    Write-Host "Uploading"
    Start-Process "c:\windows\system32\cmd.exe" -ArgumentList "/c ..\Batch\upload.cmd" -WorkingDirectory (Get-Location | Select-Object -ExpandProperty "Path")
}

# & "notepad.exe" $dlg.filename
# $dlg.Dispose();
# $dlg = $null;