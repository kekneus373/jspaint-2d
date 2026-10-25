# Release Process

This document outlines the steps for releasing a new version of JS Paint.


In [CHANGELOG.md](CHANGELOG.md), first make sure all important changes are noted in the Unreleased section, by looking over the commit history.  

The following command takes care of linting, and bumping version numbers for the package and in the changelog. It also creates a git commit and tag for the new version, and pushes the tag to GitHub.
```sh
npm run release -- $VERSION
```

Create a GitHub release manually if one is needed. This project no longer builds desktop installers.

> [!WARNING]
> "Point of no return" (spooky)

Final steps:
- `git push`
- Publish the GitHub release.
