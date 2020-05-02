#!/usr/bin/env node

const { spawn } = require('child_process')
const readline = require('readline')
const open = require('open')

async function main() {
    const target_branch = await getBranchName()
    let data = await shell(
        'git',
        'rev-list',
        '--count',
        target_branch,
        `"^origin/${target_branch}"`
    )
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
                data = (await shell('git', 'show-ref', 'refs/heads/' + branch_name)).trim()
            } catch (e) {}
            if (data) {
                console.log('Branch already exists')
            } else {
                break
            }
        }
        branch_name = await prompt('Choose a branch name: ')
    }

    // Create and checkout new branch
    await shell('git', 'checkout', '-b', branch_name)
    // Rest master to the previous state
    await shell(
        'git',
        'update-ref',
        'refs/heads/' + target_branch,
        'refs/remotes/origin/' + target_branch
    )

    try {
        await exec('git', 'push', '--set-upstream', 'origin ' + branch_name)
    } catch (err) {
        if (!err.includes('SIGINT')) throw err

        console.log('Push interrupted: Switching back to ' + target_branch)

        await shell('git', 'update-ref', 'refs/heads/' + target_branch, 'refs/heads/' + branch_name)
        await shell('git', 'checkout', target_branch)
        await shell('git', 'branch', '-d', branch_name)

        return
    }

    await openPR(target_branch)
}

async function getBranchName() {
    let data
    data = await shell('git', 'rev-parse', '--abbrev-ref HEAD')
    return data.trim()
}

async function openPR(target) {
    let branch_name = await getBranchName()
    data = await shell('git', 'remote', '-v')
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
    console.log('Opening ' + pr_url)
    await open(pr_url)
}

function prompt(question) {
    return new Promise(resolve => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        })
        rl.question(question, result => {
            resolve(result)
            rl.close()
        })
    })
}

function exec(cmd, ...args) {
    return _shell(cmd, args, true)
}

function shell(cmd, ...args) {
    return _shell(cmd, args, false)
}

function _shell(cmd, args, log) {
    return new Promise((resolve, reject) => {
        if (log) console.log(`> ${cmd} ${args.join(' ')}`)
        const proc = spawn(cmd, args, { shell: true })
        let text = ''
        proc.stdout.setEncoding('utf8')
        proc.stdout.on('data', chunk => {
            text += chunk
            if (log) process.stdout.write(chunk)
        })
        proc.stderr.setEncoding('utf8')
        proc.stderr.on('data', chunk => {
            text += chunk
            if (log) process.stderr.write(chunk)
        })
        const SIGINT_HANDLER = () => {
            proc.kill()
        }
        process.on('SIGINT', SIGINT_HANDLER)
        proc.on('close', (code, signal) => {
            process.off('SIGINT', SIGINT_HANDLER)
            if (code !== 0) {
                reject(`Command ${cmd} failed with return code ${code} and signal ${signal}`)
            } else {
                resolve(text)
            }
        })
    })
}

main().catch(err => {
    console.log(err || 'ERROR: ABORT')
})
