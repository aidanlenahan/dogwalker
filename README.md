# Dogwalker

A PWA for recording dog walks and sharing a polished report with the dog's owner.

Although this app is a work in progress, its aimed to have the following features:
- GPS route in the format of a [Strava](https://www.strava.com/) post: the walker picks per walk: record live while the app is open, or record on a watch/other app (Garmin, Apple Watch, Strava) and upload the `.gpx` afterwards, with step-by-step help articles for each. A PWA can't track in the background on iOS, so a native app is a possible later step (see [PRD §13.1, §37.1](docs/PRD.md))
- Push notification if live GPS recording stops (e.g. the phone locks mid-walk)
- Quick stats of the walk for dog walker's convenience and correspondence in the form of checkboxes (i.e. went #1, went #2, played fetch, ate dinner)
- Place to add photos
- Description
- Upon walk completion, sharable URL link with all walk details

End goals:
- Dog walker public profile
- Ability for client to review dog walker on public profile
- network of dog walkers
- Walkers and clients searchable
- Messaging within the app
