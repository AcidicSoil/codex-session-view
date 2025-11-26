# diff-views

## page will contain the following main components

* a component that will display most touched files over a broad period of time and/or session

* options to control

---

##

// TODO (session-explorer)

* parse files changed in each session
  * either through running `alias cxdiffh='git difftool -y HEAD'`
  * or for a more detailed view diffs `cxdiffc() { git difftool -y "$1" "$2"; }`
* alternative approach (find actual library or tool for getting this data from github)

// TODO

## parse and reconstruct apply_patch calls

* reconstruct events with apply_patch is used so it renders the normalized file content as if viewing the file itself