
const express = require('express');
const app = express();
const fs = require('fs');
const https = require('https');
const mongo = require('mongodb');
const config = require('./noclone/config.json');
var MongoClient = mongo.MongoClient;

////////////////////////////////////////////////////////
// Some configuration options
// const url = "mongodb://admin:pass@127.0.0.1:27017/";
const url = config.MongoConnectString;
//
// A server's source ID (SourceIdentifier) and supported versions of winget REST api
// These values are considered immutable. Changing these value or any PackageIdentifier
// will corrupt a computer's local database for this store.
// Store databases are stored in path:
// %USERPROFILE%\AppData\Local\Packages\Microsoft.DesktopAppInstaller_8wekyb3d8bbwe\LocalState
const serverID = "SentaraDMTStore";
const supportedApiVersions = [
	"1.0.0",
	"1.1.0",
];



function SetUpMariaDB() {
    // const mariadb = require('mariadb');
    // const pool = mariadb.createPool({
    //      host: '127.0.0.1', 
    //      user:'admin', 
    //      password: 'pass',
    //      connectionLimit: 5
    // });
    // async function asyncFunction() {
    //   let conn;
    //   try {
    // 	conn = await pool.getConnection();
    // 	const rows = await conn.query("SELECT 1 as val");
    // 	console.log(rows); //[ {val: 1}, meta: ... ]
    // 	//const res = await conn.query("INSERT INTO myTable value (?, ?)", [1, "mariadb"]);
    // 	//console.log(res); // { affectedRows: 1, insertId: 1, warningStatus: 0 }

    //   } catch (err) {
    // 	throw err;
    //   } finally {
    // 	if (conn) return conn.end();
    //   }
    // }

    // asyncFunction();
}

async function MongoQuery(collection = 'packages', KeyWord = '', MatchType = 'Substring', options) {
    let query = { PackageName: KeyWord }
    if(options) {
        if(options.Version) {
            query.PackageVersion = options.Version;
        }
    }
    return new Promise((resolve, reject) => {
        MongoClient.connect(url).then(
            async db => {
                var dbo = db.db("winget");
                if(MatchType=='Substring') {
                    try{
                        let test = await dbo.collection(collection).createIndex({ PackageName: "text", PackageVersion: "text" });
                        //let idx = await dbo.createIndex( { 'PackageName': "text" } );
                        //let SubstringQuery = { $text: { $search: query.PackageName }}
						let SubstringQuery = 
                        { 
                            $or: [ 
                                { $text: { $search: query.PackageName }},
                                { Tags: { $all: [query.PackageName] } }
                            ]
                        };
                        let _collection = await dbo.collection(collection);
                        let idxs = await _collection.indexes();
                        let results = await dbo.collection(collection).find(SubstringQuery).toArray();
                        db.close();
                        resolve(results);
                    }
                    catch(err) {
                        reject(err);
                    }
                }
                else {
                    let results = await dbo.collection(collection).find(query).toArray();
                    db.close();
                    resolve(results);
                }
            }).catch(
                err => {
                    reject(err);
                }
            ).finally(
                () => { }
            );
    });

}

async function MongoGetManifest(collection = 'packages', KeyWord = '', MatchType = 'Substring', options) {
	console.log(collection);
	console.log(KeyWord);
	console.log(MatchType);
	console.log(options);
	
    let query = { PackageIdentifier: KeyWord }
    if(options) {
        if(options.Version) {
            query.PackageVersion = options.Version;
        }
    }
    return new Promise((resolve, reject) => {
        MongoClient.connect(url).then(
            async db => {
                var dbo = db.db("winget");
                if(MatchType=='Substring') {
                    try{
                        let test = await dbo.collection(collection).createIndex({ PackageIdentifier: "text", PackageVersion: "text" });
                        //let idx = await dbo.createIndex( { 'PackageName': "text" } );
                        let SubstringQuery = { $text: { $search: query.PackageIdentifier }}
						console.log(JSON.stringify(SubstringQuery));
                        let _collection = await dbo.collection(collection);
                        let idxs = await _collection.indexes();
                        let results = await dbo.collection(collection).find(SubstringQuery).toArray();
                        db.close();
						console.log("MongoGetManifest");
						console.log(results);
                        resolve(results);
                    }
                    catch(err) {
						console.log(err);
                        reject(err);
                    }
                }
                else {
                    let results = await dbo.collection(collection).find(query).toArray();
					console.log(JSON.stringify(query));
                    db.close();
					console.log("MongoGetManifest");
					console.log(results);
                    resolve(results);
                }
            }).catch(
                err => {
					console.log("COULD NOT CONNECT TO MONGO");
					console.log(err);
                    reject(err);
                }
            ).finally(
                () => { }
            );
    });
}

async function MongoInsertDocument(collection = 'packages', document) {
    return new Promise((resolve, reject) => {
        MongoClient.connect(url).then(
            async (db)=>{
                try {
                    var dbo = db.db("winget");
                    let packages = await dbo.collection(collection);
                    let package = await packages.insertOne(document);
                    resolve(package.insertedId);
                }
                catch(err){
                    reject(err);
                }
            }
        )
        .catch(
            err=>{
                reject(err);
            }
        ).finally(
            ()=>{
                return;
            }
        );
    });
}

// MongoQuery().then(
//     results => {
//         console.log(results);
//     }
// ).catch(
//     err=>{
//         console.log(err);
//     }
// );

app.use(express.json());

const ssloptions = {
    key: fs.readFileSync('key.pem', 'utf8'),
    cert: fs.readFileSync('cert.pem', 'utf8')
};

const httpsServer = https.createServer(ssloptions, app);

app.get('/', (req, res) => {
    console.log("ok");
    res.status(200).json({ 'status': 'ok' });
});

app.get('/api', (req, res) => {
    console.log("ok");
    res.status(200).json({ 'status': 'ok' });
});
app.get('/api/information', (req, res) => {
    console.log("information");
    res.status(200).json(
        {
            Data: {
                'SourceIdentifier': serverID,
                'ServerSupportedVersions': supportedApiVersions,
                // 'UnsupportedPackageMatchFields': '',
                // 'RequiredPackageMatchFields': '',
                // 'UnsupportedQueryParameters': '',
                // 'RequiredQueryParameters': ''
            }
        }
    );
    //res.sendStatus(200);
    res.end();
});

app.post('/api/manifestSearch', async (req, res) => {
    console.log("manifestSearch");
    let keyword = '';
    let matchtype = '';
    let queryobject = req.body.Query
    if(queryobject) {
        keyword = queryobject.KeyWord ? queryobject.KeyWord : '';
        matchtype = queryobject.MatchType ? queryobject.MatchType : '';
    }
    let inclusions = req.body.Inclusions;
    if(inclusions) {
        let inclusion = '';
        inclusions.forEach(inc=>{
            console.log(inc);
            if(inc.PackageMatchField == 'PackageName') {
                keyword = inc.RequestMatch.KeyWord;
                matchtype = inc.RequestMatch.MatchType;
            }
        });
    }

    let matches = [];
    matches = await MongoQuery('packages', keyword, matchtype);
	console.log("=================================================");
    console.log(JSON.stringify(matches, 0, 4));
	console.log("=================================================");
	let json = {
		Data: [],
		//RequiredPackageMatchFields: []
	}
    if(matches.length > 0) {
		let dobject = {};
		for(let i=0;i<matches.length;i++){
			if(i==0){
				dobject = {
					PackageIdentifier: matches[i].PackageIdentifier,
					PackageName: matches[i].PackageName,
					Publisher: matches[i].Publisher,
					PackageVersion: matches[i].PackageVersion,
					PackageLocale: matches[i].PackageLocale,
					Channel: 'unused',
					Versions: []
				};
			}
			dobject.Versions.push({
				PackageVersion: matches[i].PackageVersion
			});
            // let dobject = {
                // PackageIdentifier: matches[i].PackageIdentifier,
				// PackageName: matches[i].PackageName,
				// Publisher: matches[i].Publisher,
				// PackageVersion: matches[i].PackageVersion,
				// PackageLocale: matches[i].PackageLocale,
				// Channel: 'unused',
				// Versions: [
					// {
						// PackageVersion: matches[i].PackageVersion,
						// PackageFamilyNames : [
							// "testing"
						// ],
						// DefaultLocale: {
							// Tags: [
								// "test"
							// ]
						// },
						// Locales: [
							// {
								// PackageLocale: "en-US",
								// Tags: [
									// "test"
								// ]
							// }
						// ]
					// }
				// ]
            // };
			// matches[0].Tags.forEach(tag=>{
				// console.log(tag);
				// if(tag.toLowerCase() == keyword.toLowerCase()) {
					// json.RequiredPackageMatchFields.push(tag);
				// }
			// });
            json.Data.push(dobject);
        }
        // let json = {
            // Data: [{
                // PackageIdentifier: matches[0].PackageIdentifier,
                // PackageName: matches[0].PackageName,
                // Publisher: matches[0].Publisher,
                // PackageVersion: matches[0].PackageVersion,
                // PackageLocale: matches[0].PackageLocale,
                // Channel: 'unused',
                // Versions: [
                    // {
                        // PackageVersion: matches[0].PackageVersion
                    // }
                // ]
            // }]
        // };
        res.status(200).json(json);
    }
    else {
        res.status(204).json({});
    }
    // res.status(200).json(
    // {

    //     'packageIdentifier': '123',
    //     'packageName': 'Notepad++',
    //     'publisher': 'somepublisher',
    //     'versions': ['1.0'],
    //     '$type': "mytype",
    //     'Data': []
    //     // Data:    [{
    //     //     'PackageIdentifier ': 'test123',
    //     //     'PackageName ': 'TestPackage',
    //     //     'Publisher': 'Trey',
    //     //     'Versions': ["1.0"],
    //     //     'UnsupportedPackageMatchFields': ["test"],
    //     //     'RequiredPackageMatchFields': ["test"],
    //     //     // 'UnsupportedQueryParameters': '',
    //     //     // 'RequiredQueryParameters': ''
    //     //     }]
    // });

    // res.status(200).json({
    //     Data: [
    //         {
    //             'PackageIdentifier': 'someidentifier',
    //             'PackageName': 'Sentara Computer Information',
    //             'Publisher': 'SCI',
    //             'PackageVersion': '1.9.9',
    //             'PackageLocale': 'en-US',
    //             'Channel': 'trey',
    //             'Versions': [
    //                 {
    //                     'PackageVersion': '1.9.9',
    //                     'PackageFamilyNames': ['Sentara Computer Information']
    //                 }
    //             ],
    //             // 'Installers': [{
    //             //     'Architecture': 'x64',
    //             //     'InstallerType': 'msix',
    //             //     'InstallerUrl': '"https://LT8V8T9Y2.local:7071/api/source.msix',
    //             //     'InstallerSha256': '092aa89b1881e058d31b1a8d88f31bb298b5810afbba25c5cb341cfa4904d843',
    //             //     'SignatureSha256': 'e53f48473621390c8243ada6345826af7c713cf1f4bbbf0d030599d1e4c175ee'
    //             // }],
    //             // 'ManifestType': 'installer',
    //             // 'ManifestVersion': '1.0.0'
    //         }
    //     ],
    //     'UnsupportedPackageMatchFields': [],
    //     'RequiredPackageMatchFields': ['Sentara Computer Information']
    // });
    //res.sendStatus(200);
    res.end();
});

app.get('/api/downloads/:pkgname', (req, res) => {
    if (fs.existsSync(`C:/Websites/WinGet/packages/${req.params.pkgname}`)) {
        res.sendFile(`C:/Websites/WinGet/packages/${req.params.pkgname}`);
    }
    else {
        res.status(200).json({});
    }
});

app.get('/api/packages', (req, res) => {
    res.status(200).json({});
});

app.get('/api/packageManifests/:id', async (req, res) => {
    console.log("packagemanifests");
	console.log("=====================================");
	console.log(req.params.id);
	console.log(req.query.Version);
	let data = null;
	try {
		data = await MongoGetManifest('packages', req.params.id, 'Exact', { Version: req.query.Version });
		console.log("PACKAGE MANIFEST DATA");
		console.log(data);
	}
	catch(err) {
		console.log(err);
	}
	
	console.log("=====================================");
	let json = {
		Data: {
			PackageIdentifier: '',
			Versions: []
		}
	}
	data.forEach(pkg=>{
		if(json.Data.PackageIdentifier=='') {
			json.Data.PackageIdentifier = pkg.PackageIdentifier;
		}
		let version = {
			'PackageVersion': pkg.PackageVersion,
			'DefaultLocale': {
				'PackageLocale': pkg.PackageLocale,//
				'PackageName': pkg.PackageName,//
				'Publisher': pkg.Publisher,//
				'Description': pkg.Description,
				'License': pkg.License,//
				'Agreements': pkg.Agreements,
				'ShortDescription': pkg.ShortDescription,//
				'Copyright': pkg.Copyright,
				'PrivacyUrl': pkg.PrivacyUrl,
				'PublisherUrl': pkg.PublisherUrl,
				'PublisherSupportUrl': pkg.PublisherSupportUrl,
				'Tags': pkg.Tags,
				'Author': pkg.Author,
				'PackageUrl': '',
				'CopyrightUrl': ''
			},
			'Installers': pkg.Installers,
			'Commands': pkg.Commands ? pkg.Commands : []
		}
		json.Data.Versions.push(version);
	});
	res.status(200).json(json);
    // let pkg = data[0];
    // res.status(200).json({
        // Data:
        // {
            // 'PackageIdentifier': pkg.PackageIdentifier,
            // 'Versions': [
                // {
                    //See PackageSchema https://github.com/microsoft/winget-cli-restsource/blob/main/documentation/WinGet-1.0.0.yaml
                    // 'PackageVersion': pkg.PackageVersion,
                    // 'DefaultLocale': {
                        // 'PackageLocale': pkg.PackageLocale,//
                        // 'PackageName': pkg.PackageName,//
                        // 'Publisher': pkg.Publisher,//
                        // 'Description': pkg.Description,
                        // 'License': pkg.License,//
                        // 'Agreements': pkg.Agreements,
                        // 'ShortDescription': pkg.ShortDescription,//
                        // 'Copyright': pkg.Copyright,
                        // 'PrivacyUrl': pkg.PrivacyUrl,
                        // 'PublisherUrl': pkg.PublisherUrl,
                        // 'PublisherSupportUrl': pkg.PublisherSupportUrl,
                        // 'Tags': pkg.Tags,
                        // 'Author': pkg.Author,
                        // 'PackageUrl': '',
                        // 'CopyrightUrl': ''
                    // },
                    // 'Installers': pkg.Installers,
					// 'Commands': pkg.Commands ? pkg.Commands : []

                // }
            // ]
        // }

    // });
    return;
    
    res.status(200).json({
        Data:
        {
            'PackageIdentifier': pkg.PackageIdentifier,
            'Versions': [
                {
                    // See PackageSchema https://github.com/microsoft/winget-cli-restsource/blob/main/documentation/WinGet-1.0.0.yaml
                    'PackageVersion': pkg.PackageVersion,
                    'DefaultLocale': {
                        'PackageLocale': pkg.PackageLocale,
                        'PackageName': pkg.PackageName,
                        'Publisher': pkg.Publisher,
                        'Description': pkg.Description,
                        'License': pkg.License,
                        'Agreements': pkg.Agreements,
                        'ShortDescription': pkg.ShortDescription,
                        'Copyright': pkg.Copyright,
                        'PrivacyUrl': pkg.PrivacyUrl,
                        'PublisherSupportUrl': pkg.PublisherSupportUrl,
                        'Tags': pkg.Tags
                    },
                    'Installers': pkg.Installers

                }
            ]
        }

    });
    // res.status(200).json({
    //     Data:
    //     {
    //         'PackageIdentifier': 'someidentifier',
    //         'Versions': [
    //             {
    //                 'PackageVersion': '1.9.9',
    //                 'DefaultLocale': {
    //                     'PackageLocale': 'en-us',
    //                     'PackageName': 'Sentara Computer Information',
    //                     'Publisher': 'TestPub',
    //                     'Description': 'test',
    //                     'License': '',
    //                     'Agreements': [],
    //                     'ShortDescription': 'Some description',
    //                     'Copyright': '',
    //                     'PrivacyUrl': '',
    //                     'PublisherSupportUrl': '',
    //                     'Tags': []
    //                 },
    //                 'Installers': [
    //                     {
    //                         'Architecture': 'x64',
    //                         'InstallerType': 'msi',
    //                         'InstallerUrl': "http://LT8V8T9Y2.local:7070/api/Sentara_Computer_Information_setup_v1.9.9.msi",
    //                         'InstallerSha256': '29B5EE7F35D0A48C5EC67A53F55210269343147CE608F351BD8516C0A5D290ED',
    //                         'InstallMode': 'silent'
    //                     }
    //                 ]

    //             }
    //         ]
    //     }

    // });
});

app.put('/api/package', (req, res)=>{
    console.log(req);
    res.status(200).json({status: 'ok'});
    //MongoInsertDocument('packages', )
});

app.listen(7070, () => {
    console.log("Web server listening");
});

httpsServer.listen(7071, () => {
    console.log("https listening");
});