/**
 * simple DEBUG output flag for now
 * We'll use morgan for any middleware
 * and winston for everything else
 */
const ISDEBUG=false;

const express = require('express');
const app = express();
const fs = require('fs');
const https = require('https');
const mongo = require('mongodb');
const config = require('./noclone/config.json');
var MongoClient = mongo.MongoClient;

////////////////////////////////////////////////////////
const url = config.MongoConnectString;
//
// A server's source ID (SourceIdentifier) and supported versions of winget REST api
// These values are considered immutable. Changing these value or any PackageIdentifier
// will corrupt a computer's local database for this store.
// Store databases are stored in path:
// %USERPROFILE%\AppData\Local\Packages\Microsoft.DesktopAppInstaller_8wekyb3d8bbwe\LocalState
//
const serverID = config.Server.serverID;
const supportedApiVersions = config.Server.supportedApiVersions;

/**
 * 
 * @param {string} collection The collection name in our MongoDB
 * @param {string} KeyWord What are we searching for
 * @returns 
 */
async function MongoQuery(collection = 'packages', KeyWord = '', MatchType) {
    return new Promise((resolve, reject) => {
        MongoClient.connect(url).then(
            async db => {
                var dbo = db.db("winget");
                try {
                    let query = {};
                    if(MatchType==="Exact") {
                        query = {
                            $or: [
                                { $text: { $search: `\"${KeyWord}\"` } },
                                { Tags: { $all: [KeyWord] } }
                            ]
                        }
                    }
                    else if(MatchType === "Substring") {
                        query = {
                            $or: [
                                 { PackageName : new RegExp(`${KeyWord}`, 'ig') },
                                 { PackageIdentifier : new RegExp(`${KeyWord}`, 'ig') },
                                 { Tags: { $all: [KeyWord] } }
                            ]
                        }
                    }
                    let _collection = await dbo.collection(collection);
                    let idxs = await _collection.indexes();
                    let results = await dbo.collection(collection).find(query).toArray();
                    db.close();
                    resolve(results);
                }
                catch (err) {
                    reject(err);
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

function mtest() {
    MongoInclusions('packages', [
        {
			"PackageMatchField": "PackageName",
			"RequestMatch": {
				"KeyWord": "CoffeeBreak",
				"MatchType": "CaseInsensitive"
			}
		}
    ]).then(
        results=> {
            console.log("Resolved results");
            console.log(results);
        }
    )
}

async function MongoInclusions(collection = 'packages', Inclusions) {
    return new Promise((resolve, reject) => {
        //var allresults = [];
        MongoClient.connect(url).then(
            async db => {
                var dbo = db.db("winget");
                var allresults = [];
                for(let inc of Inclusions) {
                    let fieldname = inc.PackageMatchField == "Moniker" ? "Tags" : inc.PackageMatchField;
                    let matchtype = inc.RequestMatch.MatchType;
                    let keyword   = inc.RequestMatch.KeyWord;
                    if(matchtype.toUpperCase() === "EXACT") { // I'm not sure if "Exact" should be case-insensitive
                        if(ISDEBUG) console.log("Executing EXACT search");
                        let rgx = new RegExp(`^${keyword}$`, 'ig');

                        // wrap fieldname in square brackets - not sure what the library is
                        // doing, but it works.
                        let results = await dbo.collection(collection).find({[fieldname]: {$regex: rgx}}).toArray();
                        allresults = allresults.concat(results);
                    }
                    if(matchtype.toUpperCase() === "CASEINSENSITIVE" || 
                       matchtype.toUpperCase() === "SUBSTRING" ) {
                        if(ISDEBUG) console.log("Executing CASEINSENSITIVE search");
                        let rgx = new RegExp(`${keyword}`, 'ig');
                        let query = {};
                        
                        // Must construct an array text search if we need to search Tags
                        if(fieldname==="Tag") {
                            query = { Tags: { $all: [keyword] } }
                        }
                        else {
                            query = {[fieldname]: {$regex: rgx}};
                        }

                        // wrap fieldname in square brackets - not sure what the library is
                        // doing, but it works.
                        // let results = await dbo.collection(collection).find({[fieldname]: {$regex: rgx}}).toArray();
                        let results = await dbo.collection(collection).find(query).toArray();
                        allresults = allresults.concat(results);
                    }
                }
                
                resolve(allresults);
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
	if(ISDEBUG) console.log(collection);
	if(ISDEBUG) console.log(KeyWord);
	if(ISDEBUG) console.log(MatchType);
	if(ISDEBUG) console.log(options);
	
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
						if(ISDEBUG) console.log(JSON.stringify(SubstringQuery));
                        let _collection = await dbo.collection(collection);
                        let idxs = await _collection.indexes();
                        let results = await dbo.collection(collection).find(SubstringQuery).toArray();
                        db.close();
						if(ISDEBUG) console.log("MongoGetManifest");
						if(ISDEBUG) console.log(results);
                        resolve(results);
                    }
                    catch(err) {
						if(ISDEBUG) console.log(err);
                        reject(err);
                    }
                }
                else {
                    let results = await dbo.collection(collection).find(query).toArray();
					if(ISDEBUG) console.log(JSON.stringify(query));
                    db.close();
					if(ISDEBUG) console.log("MongoGetManifest");
					if(ISDEBUG) console.log(results);
                    resolve(results);
                }
            }).catch(
                err => {
					if(ISDEBUG) console.log("COULD NOT CONNECT TO MONGO");
					if(ISDEBUG) console.log(err);
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

app.use(express.json());

const ssloptions = {
    key: fs.readFileSync(config.Server.WebConfig.SSL.private_key, 'utf8'),
    cert: fs.readFileSync(config.Server.WebConfig.SSL.certificate, 'utf8')
};

const httpsServer = https.createServer(ssloptions, app);

app.get('/', (req, res) => {
    res.status(200).json({ 'status': 'ok' });
});

app.get('/api', (req, res) => {
    // When adding a source, winget-cli expects a 200 response.
    res.status(200).json({ 'status': 'ok' });
});

app.get('/api/information', (req, res) => {
    if(ISDEBUG) console.log("information");
    res.status(200).json(
        {
            Data: {
                'SourceIdentifier': serverID,
                'ServerSupportedVersions': supportedApiVersions
            }
        }
    );
});

app.post('/api/manifestSearch', async (req, res) => {
    if(ISDEBUG) console.log("manifestSearch");
    let matches = [];

    let keyword = '';
    let matchtype = '';

    // A Query in the body indicates a winget-cli search request
    // See the docs folder for an example of the request format
    let queryobject = req.body.Query
    if(queryobject) {
        keyword = queryobject.KeyWord ? queryobject.KeyWord : '';
        matchtype = queryobject.MatchType ? queryobject.MatchType : '';
        matches = await MongoQuery('packages', keyword, matchtype);
    }

    // An Inclusions in the body indicates a winget-cli install request
    // See the docs folder for an example of the request format
    let inclusions = req.body.Inclusions;
    if(inclusions) {
        matches = await MongoInclusions('packages', inclusions);
    }
    let filters = req.body.Filters;
    if(filters) {
        matches = await MongoInclusions('packages', inclusions);
    }

    // let matches = [];
    // matches = await MongoQuery('packages', keyword, matchtype);
	
    if(ISDEBUG) console.log("=================================================");
    if(ISDEBUG) console.log(JSON.stringify(matches, 0, 4));
	if(ISDEBUG) console.log("=================================================");
	
    /**
     * The different search types (Query, Inclusion, Filter),
     * have very similar return formats. This looks
     * confusing, so fix this later.
     * 
     * Query = search
     * Inclusion = install
     * Filter = search with filter
     * --There are probably additional search types
     * --that I either need to find in the official docs,
     * --or just test with fiddler or something.
     * --Inclusion with filter may be one.
     */
    let json = {
		Data: []
	}
    if(matches.length > 0) {
		let dobject = {};
		for(let i=0;i<matches.length;i++){
			if(i==0 && inclusions !== undefined){
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
            else if(filters !== undefined || queryobject !== undefined)  {
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
            
            json.Data.push(dobject);
        }
        
        res.status(200).json(json);
    }
    else {
        res.status(204).json({});
    }
    
    res.end();
});

/**
 * This endpoint is only meant for testing packages locally
 * during development. This should be disabled in a production
 * environment. Packages should be delivered from a dedicated content
 * server (GitLFS, OneDrive, or any onprem web accessible content server).
 */
app.get('/api/downloads/:pkgname', (req, res) => {
    if (fs.existsSync(`${config.PackagesPath}${req.params.pkgname}`)) {
        res.sendFile(`${config.PackagesPath}${req.params.pkgname}`);
    }
    else {
        res.status(200).json({});
    }
});

app.get('/api/packages', (req, res) => {
    res.status(200).json({});
});

app.get('/api/packageManifests/:id', async (req, res) => {
    if(ISDEBUG) console.log("packagemanifests");

	if(ISDEBUG) console.log("=====================================");
	if(ISDEBUG) console.log(req.params.id);
	if(ISDEBUG) console.log(req.query.Version);
	let data = null;
	try {
		data = await MongoGetManifest('packages', req.params.id, 'Exact', { Version: req.query.Version });
		if(ISDEBUG) console.log("PACKAGE MANIFEST DATA");
		if(ISDEBUG) console.log(data);
	}
	catch(err) {
		if(ISDEBUG) console.log(err);
	}
	if(ISDEBUG) console.log("=====================================");

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
});

app.post('/api/package', (req, res)=>{
    if(ISDEBUG) console.log(req);
    MongoInsertDocument('packages', req.body).then(
		result=>{
			if(ISDEBUG) console.log(result);
		}
	).
	catch(
		err=> {
			
		}
	).
	finally(
		()=> {
			res.status(200).json({status: 'ok'});
		}
	);
});

app.listen(config.Server.WebConfig.httpPort, () => {
    console.log(`HTTP  | Web server listening on ${config.Server.WebConfig.httpPort}`);
});

httpsServer.listen(config.Server.WebConfig.httpsPort, () => {
    console.log(`HTTPS | Web server listening on ${config.Server.WebConfig.httpsPort}`);
});