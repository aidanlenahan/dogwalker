# Dogwalker

A PWA for recording dog walks and sharing a polished report with the dog's owner.

Although this app is a work in progress, its aimed to have the following features:
- GPS route in the format of a [Strava](https://www.strava.com/) post: recorded live while the app is open, or imported as a `.gpx` from a watch (Garmin, Apple Watch, Strava). A PWA can't track in the background on iOS, so a native app is a possible later step (see [PRD §13.1, §37.1](docs/PRD.md))
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
