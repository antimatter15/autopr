#!/usr/bin/env node

const { spawn } = require('child_process')
const readline = require('readline')
const open = require('open')

async function main() {
    const target_branch = 'master'
    let data
    data = await shell('git', ['rev-parse', '--abbrev-ref HEAD'])

    if (data.trim() !== target_branch) {
        let branch_name = await getBranchName()
        // data = await exec('git', ['rev-list', '--count', 'HEAD', '"^origin/' + branch_name + '"'])
        // if (parseInt(data.trim()) != 0) throw 'ERROR: Unpushed changes in branch'
        await exec('git', ['push', '--set-upstream', 'origin ' + branch_name])

        await openPR(target_branch)
        return
    }

    data = await shell('git', ['rev-list', '--count', target_branch, `"^origin/${target_branch}"`])
    if (parseInt(data.trim()) === 0) {
        throw 'ERROR: No commits to turn into pull request.\nCommit your changes before running this command.'
    }

    let args = process.argv.slice(2)
    let branch_name = args[0] || ''

    while (true) {
        if (
            !/^(?!\/|.*([/.]\.|\/\/|@\{|\\\\))[^\040\177 ~^:?*\[]+(?<!\.lock|[/.])$/.test(
                branch_name
            )
        ) {
            if (branch_name) console.log('Invalid branch name')
        } else {
            let data
            try {
                data = (await shell('git', ['show-ref', 'refs/heads/' + branch_name])).trim()
            } catch (e) {}
            if (data) {
                console.log('Branch already exists')
            } else {
                break
            }
        }
        branch_name = await prompt('Choose a branch name: ')
    }

    await exec('git', ['branch', branch_name])
    await exec('git', ['reset', '--keep', 'origin/' + target_branch])
    await exec('git', ['checkout', branch_name])
    await exec('git', ['push', '--set-upstream', 'origin ' + branch_name])
    await openPR(target_branch)
}

async function getBranchName() {
    let data
    data = await shell('git', ['rev-parse', '--abbrev-ref HEAD'])
    return data.trim()
}
async function openPR(target) {
    let branch_name = await getBranchName()
    data = await shell('git', ['remote', '-v'])
    let remotes = data
        .trim()
        .split('\n')
        .filter(k => k.includes('github'))
    if (!remotes[0]) throw 'ERROR: no Github remotes found'
    let repo_url =
        'http://' +
        remotes[0]
            .split(/\s/)[1]
            .replace('git://', '')
            .replace('git@', '')
            .replace('https://', '')
            .replace('ssh://', '')
            .replace(':', '/')
            .replace(/\.git$/, '')
    let pr_url = repo_url + '/pull/new/' + target + '...' + branch_name
    console.log('> Opening ' + pr_url)
    await open(pr_url)
}

function prompt(question) {
    return new Promise(resolve => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        })
        rl.on('close', function() {
            // process.exit(0);
        })
        rl.question(question, result => {
            resolve(result)
            rl.close()
        })
    })
}

function exec(cmd, args) {
    return shell(cmd, args, true)
}

function shell(cmd, args, log = false) {
    return new Promise((resolve, reject) => {
        if (log) console.log(`> ${cmd} ${args.join(' ')}`)
        const proc = spawn(cmd, args, { shell: true })
        let text = ''
        proc.stdout.setEncoding('utf8')
        proc.stdout.on('data', chunk => {
            text += chunk
        })
        proc.stderr.setEncoding('utf8')
        proc.stderr.on('data', chunk => {
            text += chunk
        })
        proc.on('close', code => {
            if (code !== 0) {
                reject(`Command ${cmd} failed with return code ${code}: \n\n${text}`)
            } else {
                resolve(text)
            }
        })
    })
}

main().catch(err => {
    console.log(err || 'ERROR: ABORT')
})
