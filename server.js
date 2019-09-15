const express = require('express');
const fs = require('fs');
const app = express();
const {
    exec,
    execFile
} = require('child_process');
app.use(express.json())

app.get('/api/repos', (req, res) => {
    const path = process.argv[2];
    let reposArray = [];

    fs.readdir(path, {
        "withFileTypes": true
    }, (err, files) => {
        files.forEach(file => {
            reposArray.push(file.name);
        });
        res.send(reposArray);
    });
});

app.get('/api/repos/:repositoryId/commits/:commitHash', (req, res) => {
    const repositoryId = req.params.repositoryId;
    const commitHash = req.params.commitHash;
    execFile('git', ['log', commitHash, '--pretty=format:"{commit: %h, date: %ad, comments: %s}"'], {
        cwd: `repos/${repositoryId}`
    }, (err, out) => {
        if (err) {
            console.error(err)
            res.status(404).send("NOT FOUND.");
        } else {
            let commitsObject = [];
            const commitDetailsArray = out.match(/(?<={commit: )\w+|(?<=, date: )[\w\s:-]+|(?<=comments: )[^}]+/g);

            if (commitDetailsArray.length >= 3) {
                for (let i = 0, lenght = commitDetailsArray.length - 3; i < lenght; i = i + 3) {
                    commitsObject.push({
                        "commitHash": commitDetailsArray[i],
                        "date": commitDetailsArray[i + 1],
                        "comments": commitDetailsArray[i + 2]
                    })
                }

                res.send(commitsObject);
            }
        }
    });
});

app.get('/api/repos/:repositoryId/commits/:commitHash/diff', (req, res) => {
    const repositoryId = req.params.repositoryId;
    const commitHash = req.params.commitHash;
    let currentCommit, previousCommit;

    process.chdir(`./repos/${repositoryId}`);

    exec(`git log`, (err, out) => {
        if (err) {
            console.error(err);
            res.status(404).send("NOT FOUND.");
        } else {
            commitsArray = out.match(/(?<=commit ).+/g);
            for (let i = 0; i < commitsArray.length; i++) {
                const reg = new RegExp(`^${commitHash}`);
                if (commitsArray[i].match(reg)) {
                    currentCommit = commitsArray[i];
                    previousCommit = commitsArray[i + 1] ? commitsArray[i + 1] : '';
                    break;
                }
            }

            exec(`git diff ${currentCommit} ${previousCommit}`, (err, out) => {
                if (err) {
                    console.error(err);
                    res.status(404).send("NOT FOUND.");
                } else {
                    if (out == '') res.send("NO SHANGES");
                    res.send(out);
                }
            });

        }
    });
});

app.get('/api/repos/:repositoryId/?(tree/:commitHash/:path([^/]*)?)?', (req, res) => {
    const repositoryId = req.params.repositoryId;
    const commitHash = req.params.commitHash;
    const path = req.params.path;

    if (commitHash) {
        execFile('git', ['ls-tree', '-r', '--name-only', commitHash], {
            cwd: `repos/${repositoryId}`
        }, (err, out) => {
            // exec(`git ls-files`, (err, out) => {
            if (err) {
                console.error(err);
                res.status(404).send("NOT FOUND.");
            } else {
                const filesArray = out.split('\n');
                const filesFromDirectory = filesArray.filter(file => file.match(path));
                const newArray = filesFromDirectory.map(file => file.replace(`${path}/`, ''));

                res.send(newArray)
            }
        });
    } else {
        execFile('git', ['ls-tree', '-r', '--name-only', 'master'], {
            cwd: `repos/${repositoryId}`
        }, (err, out) => {

            if (err) {
                console.error(err);
                res.status(404).send("NOT FOUND.");
            } else {
                const filesArray = out.split('\n');

                res.send(filesArray)
            }
        });
    }
});

app.get('/api/repos/:repositoryId/blob/:commitHash/:pathToFile([^/]*)?', (req, res) => {
    const repositoryId = req.params.repositoryId;
    const commitHash = req.params.commitHash;
    const pathToFile = req.params.pathToFile;

    execFile('git', ['show', `${commitHash}:${pathToFile}`], {
        cwd: `repos/${repositoryId}`
    }, (err, out) => {

        if (err) {
            console.error(err);
            res.status(404).send("NOT FOUND.");
        } else {
            res.send(out)
        }
    });

});

app.delete('/api/repos/:repositoryId', function(req, res) {
    const repositoryId = req.params.repositoryId;

    fs.rmdir(`repos/${repositoryId}`, { "recursive": true }, (err, out) => {
        if (err) {
            console.error(err);
            res.status(404).send("NOT FOUND.");
        } else {
            res.send('Repository deleted')
        }
    });
})

app.post('/api/repos', (req, res) => {
    execFile('git', ['clone', req.body.url], {
        cwd: `repos/`
    }, (err, out) => {

        if (err) {
            console.error(err);
            res.status(404).send("NOT FOUND.");
        } else {
            res.send("repository loaded")
        }
    });

});



app.listen(3000);