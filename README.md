# autopr

Do you ever feel crippled by the anxiety of having to decide the name of a branch to create in Git,
before you're sure what you're doing next.

`autopr` is a new fantastic tool that lets you _prolong_ your indecision! Now you don't have to
decide what to name a branch until the _last-possible_ moment— mere seconds before you poke your
coworkers to review your pull request!

Now you'll have the idle time while coding to mull over a better branch name with more brevity or
wit.

Or if you end up deciding to do something else altogether— you won't find your `git branch` to be
littered with the carcasses of unfulfilled intentions.

## how to use it

1. Commit your changes on top of `master` with wreckless abandon

2. Instead of pushing, run `apr my-new-branch-name` and it'll transfer all your your new
   `my-new-branch-name` branch, while resetting `master` to its old state. It'll then automatically
   push `my-new-branch-name` to the remote origin, and open the pull request creation wizard in your
   browser.

3. Grab a nerf gun to prod those unfortunate souls around you deigned to review your request

## how to install it

```
    npm install -g autopr
```

This will install the `autopr` command and its more suave cousin `apr`
