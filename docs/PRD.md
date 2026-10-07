\# Dog Walking PWA — MVP PRD



\*\*Version:\*\* 0.1  

\*\*Status:\*\* MVP / Proof of Concept  

\*\*Platform:\*\* Progressive Web App  

\*\*Primary user:\*\* Independent dog walker  

\*\*Secondary user:\*\* Dog owner viewing a shared walk  

\*\*Initial deployment:\*\* Self-hosted Linux server/LXC



\---


NOTES:

- have two options for user: keep app open during GPS record or record GPS and then upload later (include directions on how to do that in articles page)




\## 1. Product Summary



The Dog Walking PWA allows an independent dog walker to record a walk and turn the resulting information into a polished report that can be shared with the dog's owner.



A walker starts a new walk, optionally enables GPS tracking and other data collection, records events such as pee, poop, water, feeding, photos, and notes during the walk, and finishes the walk when complete.



The application then generates a walk report containing the selected information. The walker reviews the report before publishing it and receives an unlisted shareable URL that can be sent to the owner.



The application also provides an optional public walker profile containing information about the walker, testimonials, statistics, and walks the walker explicitly chooses to make public.



The MVP will be built as a PWA rather than a native iOS or Android application.



\---



\# 2. Problem



Independent dog walkers commonly communicate completed-walk information through text messages containing manually written updates and photos.



This provides little structure and makes information such as routes, distance, duration, photos, and care events difficult to present consistently.



The application should make documenting a walk nearly effortless while producing a professional report for the owner.



\---



\# 3. Product Goal



The primary workflow must be:



\*\*Start Walk → Record Walk → Finish Walk → Review → Publish → Share\*\*



A successful MVP allows a walker to complete this workflow during a real dog walk entirely from a smartphone.



The product should prioritize:



\- Extremely fast interaction while walking

\- Mobile-first design

\- Reliable recording

\- Privacy

\- Useful information rather than excessive statistics

\- Attractive client-facing reports

\- Minimal setup before starting a walk



\---



\# 4. Non-Goals



The following are explicitly outside the MVP:



\- Payments

\- Invoicing

\- Booking

\- Scheduling

\- Employee management

\- Multiple walkers per business

\- Client accounts

\- Client messaging

\- Native iOS application

\- Native Android application

\- App Store distribution

\- Live client GPS tracking

\- Automatic review verification

\- Advanced analytics

\- AI-generated summaries

\- PDF reports

\- Weather integration

\- Push notifications

\- Calendar integration



These features may be considered after the core walk workflow is reliable.



\---



\# 5. User Types



\## 5.1 Walker



Authenticated user who creates and manages walks.



The walker can:



\- Sign in

\- Manage dogs

\- Start walks

\- Record walk information

\- Finish walks

\- Review/edit completed walks

\- Publish walks

\- Generate share links

\- View previous walks

\- Manage their public profile

\- Select walks to display publicly

\- Manage testimonials



\## 5.2 Client / Dog Owner



No account is required.



The client can:



\- Open a shared walk URL

\- View the walk report

\- View permitted GPS information

\- View statistics

\- View activity/events

\- View photos

\- Read the walker's notes

\- View the walker's public profile



Clients cannot modify walk information.



\---



\# 6. Core User Flow



```text

Dashboard

&#x20;   |

&#x20;   +-- New Walk

&#x20;          |

&#x20;          +-- Select/Create Dog

&#x20;          |

&#x20;          +-- Select Tracking Options

&#x20;          |

&#x20;          +-- Start Walk

&#x20;                 |

&#x20;                 +-- GPS Tracking

&#x20;                 +-- Timer

&#x20;                 +-- Event Logging

&#x20;                 +-- Photos

&#x20;                 +-- Notes

&#x20;                 |

&#x20;                 +-- Finish Walk

&#x20;                        |

&#x20;                        +-- Review

&#x20;                        |

&#x20;                        +-- Edit

&#x20;                        |

&#x20;                        +-- Publish

&#x20;                               |

&#x20;                               +-- Generate Share Link

&#x20;                               |

&#x20;                               +-- Share with Owner

```



\---



\# 7. Dashboard



The dashboard is the primary authenticated landing page.



It should display:



\- New Walk button

\- Any currently active walk

\- Recent completed walks

\- Dog shortcuts

\- Profile shortcut



Example:



```text

Good afternoon, Aidan



\[ + NEW WALK ]



ACTIVE WALK



Bailey

23:17 | 1.21 mi

\[ Resume ]



RECENT WALKS



Bailey

Yesterday

32 min | 1.6 mi

\[ View ]



Cooper

September 29

27 min | 1.2 mi

\[ View ]

```



An active walk should always be highly visible so the walker cannot accidentally lose track of it.



\---



\# 8. Dogs



The MVP requires lightweight dog profiles.



Each dog contains:



\- ID

\- Name

\- Owner name

\- Optional photo

\- Optional notes

\- Created timestamp



Example notes could include:



\- Avoid other dogs

\- Pulls near traffic

\- Water after walk

\- Owner prefers 30-minute walks



Full client CRM functionality is outside MVP scope.



\---



\# 9. Starting a Walk



The walker selects \*\*New Walk\*\*.



Required:



\- Dog



Optional tracking features:



\- GPS route

\- Walk statistics

\- Photos

\- Activity/care log



Optional:



\- Pre-walk note



Example:



```text

NEW WALK



Dog

\[ Bailey                     ]



Track



\[x] GPS Route

\[x] Walk Statistics

\[x] Photos

\[x] Activity Log



Pre-Walk Notes



\[                              ]



\[ START WALK ]

```



Defaults should eventually remember the walker's previous preferences.



\---



\# 10. Active Walk



The Active Walk screen must be designed for one-handed smartphone use.



Primary information:



\- Dog name

\- Elapsed time

\- Distance

\- Pace

\- GPS map

\- GPS status



Primary actions:



\- Pee

\- Poop

\- Water

\- Fed

\- Photo

\- Note

\- Finish Walk



Example:



```text

BAILEY'S WALK



00:24:17



1.21 miles

20:04 / mile



+-----------------------------+

|                             |

|          LIVE MAP           |

|                             |

|       -------\*              |

|      /                      |

|  ----                       |

|                             |

+-----------------------------+



QUICK LOG



\[ Pee ]       \[ Poop ]



\[ Water ]     \[ Fed ]



\[ Photo ]     \[ Note ]



RECENT ACTIVITY



12:52 PM  Pee

1:03 PM   Photo

1:08 PM   Water



\[ FINISH WALK ]

```



Buttons must have large touch targets.



\---



\# 11. Walk Events



Care actions must be stored as events rather than boolean fields.



Event types for MVP:



\- `pee`

\- `poop`

\- `water`

\- `fed`

\- `note`

\- `other`



Each event stores:



\- Event ID

\- Walk ID

\- Type

\- Timestamp

\- Optional note

\- Optional latitude

\- Optional longitude



This permits multiple events of the same type.



Example:



```text

12:43 PM    Pee

12:51 PM    Pee

1:02 PM     Water

1:14 PM     Poop

```



Events must be editable or removable before publication.



\---



\# 12. GPS Tracking



If enabled, the application uses the browser Geolocation API.



Each GPS sample should store:



\- Walk ID

\- Timestamp

\- Latitude

\- Longitude

\- Accuracy

\- Optional altitude

\- Optional speed when available



The frontend should use continuous location tracking while the active walk interface is running.



The system should not blindly count every reported GPS position toward distance.



Points with clearly unacceptable accuracy should be rejected or marked for filtering.



Distance should be calculated from accepted sequential GPS points.



Initial calculations:



\- Total distance

\- Duration

\- Average pace



The route should be displayed on a map.



\## 12.1 Route Sources



A walk's route can come from one of two sources. Both store points in `gps\_points` and use the same filtering, distance, and map code.



1\. \*\*Live recording (default):\*\* `watchPosition` while the Active Walk screen is open in the foreground. The Screen Wake Lock API is used to keep the screen on so the browser keeps delivering positions.



2\. \*\*GPX import (fallback):\*\* the walker records the walk on another device or app (Apple Watch, Garmin, Strava, etc.), exports a `.gpx` file, and uploads it to the walk from the Review screen. Points outside the walk's start/end window are discarded. Imported points replace any live points for that walk.



Typical export paths: Garmin Connect (activity → Export to GPX), Strava (activity → Export GPX), Apple Watch workouts via a third-party iPhone app such as HealthFit or WorkOutDoors.



Events logged without a location (e.g. while live GPS was off) may be geotagged after import by matching their timestamps to the imported track.



Each walk records its route source: `none | live | import`.



GPX is the only import format for MVP. FIT/TCX can be added later if needed.



\---



\# 13. GPS Reliability



PWA background GPS behavior, particularly on iOS, must be treated as an experimental constraint.



The MVP must test:



1\. PWA active with screen on

2\. PWA active with screen locked

3\. Switching applications temporarily

4\. Loss of network connectivity

5\. Reopening the PWA

6\. Temporary GPS loss



The application should preserve collected data locally when practical until it has been confirmed by the backend.



An interruption must not silently destroy an entire walk.



If reliable background tracking cannot be achieved through the PWA, this limitation should be documented rather than delaying the entire MVP.



The backend API must remain client-independent so a future native application can reuse it.



\## 13.1 Decision (October 2026)



iOS suspends a Home Screen PWA's JavaScript, including `watchPosition`, shortly after the screen locks or the walker switches apps. A PWA cannot run background location, and it cannot read Apple Health/HealthKit data.



Therefore:



\- Live recording is foreground-only. The Active Walk screen holds a screen wake lock, tells the walker to keep the app open, and shows gaps honestly (no invented points across a gap).



\- GPX import (§12.1) is the reliable path for walkers who want a complete route with the phone in a pocket.



\- The Background Sync API is not available on iOS Safari, so syncing uses the app's own IndexedDB queue with retry on reconnect/foreground (§26).



\- No Apple developer account, Mac, or App Store release is needed for MVP.



Results of the on-device check are recorded in `docs/gps-findings.md`. A native client is the long-term fix (§37.1).



\---



\# 14. Photos



During a walk, the walker can add photos.



Each photo contains:



\- ID

\- Walk ID

\- Timestamp

\- Storage location

\- Optional caption



Photos should be compressed before or during upload where practical.



The walker can remove a photo before publishing.



The MVP does not require sophisticated photo editing.



\---



\# 15. Notes



Two types of notes are supported:



\### Event Notes



Timestamped note recorded during the walk.



Example:



> Bailey saw another dog and remained calm.



\### Final Walk Notes



General summary written before publishing.



Example:



> Bailey had lots of energy today. We walked along the waterfront, stopped for water, and she did great around other dogs.



\---



\# 16. Finishing a Walk



Selecting \*\*Finish Walk\*\*:



1\. Stops the timer.

2\. Stops GPS collection.

3\. Records the ending timestamp.

4\. Calculates final statistics.

5\. Changes status from `active` to `completed`.

6\. Opens the Review screen.



Finishing does NOT automatically publish the walk.



\---



\# 17. Review Screen



The walker reviews all information before publication.



Display:



\- Dog

\- Date

\- Start/end time

\- Duration

\- Distance

\- Pace

\- Route

\- Events

\- Photos

\- Final notes



The walker can:



\- Edit notes

\- Delete events

\- Add/remove photos

\- Correct basic information

\- Publish walk



Example:



```text

BAILEY'S WALK



October 2, 2026



32:14

1.63 miles

19:46 / mile



\[ ROUTE MAP ]



ACTIVITY



12:52 PM   Pee

1:08 PM    Water

1:17 PM    Poop



PHOTOS



\[ image ] \[ image ] \[ + ]



WALK NOTES



Bailey had lots of energy today...



\[ EDIT ]



\[ PUBLISH \& CREATE LINK ]

```



\---



\# 18. Publishing



Publishing changes the walk status:



```text

completed -> published

```



Publishing generates a cryptographically random public share token.



Example:



```text

/w/aP7k2MzQ...

```



Database IDs must not be exposed as the mechanism for accessing private shared walks.



Example of unacceptable public URL:



```text

/walk/42

```



The share token must be sufficiently random to make enumeration impractical.



\---



\# 19. Sharing



After publication:



```text

SHARE BAILEY'S WALK



\[ Copy Link ]



\[ Share... ]



Visibility



(\*) Unlisted

( ) Public

```



Where supported, the PWA should use the Web Share API to open the operating system's native share interface.



Otherwise, Copy Link must always be available.



\---



\# 20. Walk Visibility



Walks have three states:



\### Private



Only authenticated walker can access.



\### Unlisted



Accessible using the random share URL.



Not shown on public profile.



Default for published client reports.



\### Public



May appear on the walker's public profile.



Public walks should not expose sensitive GPS information by default.



For MVP, exact GPS routes should be omitted from publicly listed profile walks unless explicitly designed otherwise.



\---



\# 21. Client Walk Report



The shareable report is the primary client-facing product.



It should be mobile-friendly and visually polished.



Example structure:



```text

Bailey's Walk



October 2, 2026

12:47 PM - 1:19 PM



32 MIN       1.63 MI       19:46/MI



\--------------------------------



ROUTE



\[ Map ]



\--------------------------------



ACTIVITY



Pee       12:52 PM

Water      1:08 PM

Poop       1:17 PM



\--------------------------------



PHOTOS



\[ Photo ]    \[ Photo ]



\--------------------------------



WALK NOTES



"Bailey had lots of energy today..."



Aidan

```



The report must require no client login.



\---



\# 22. Walker Profile



Each walker has a public profile.



Example URL:



```text

/u/aidan

```



Profile contains:



\- Name

\- Profile photo

\- General service area

\- Bio

\- Aggregate walk statistics

\- Testimonials

\- Selected public walks



Potential statistics:



\- Number of walks

\- Total distance

\- Total walking time



Sensitive client information must never appear automatically.



\---



\# 23. Testimonials



MVP testimonials are manually managed by the walker.



Fields:



\- Client display name

\- Testimonial

\- Optional rating

\- Created date

\- Visibility



Automated client review submission is post-MVP.



\---



\# 24. Authentication



Only the walker/admin requires authentication in the MVP.



Required functionality:



\- Login

\- Logout

\- Persistent authenticated session

\- Protected API endpoints



Public report and profile endpoints do not require authentication.



Passwords must never be stored directly.



Use a modern password hashing algorithm supported by the authentication implementation.



Authentication should be designed so additional users could eventually be supported even though MVP deployment may contain only one walker.



\---



\# 25. Privacy and Security



GPS data is sensitive because routes may reveal client residences and routines.



Security requirements:



\- HTTPS required in production

\- Random walk share tokens

\- No sequential public walk identifiers

\- Authentication required for management endpoints

\- Server-side authorization checks

\- Input validation

\- Secure password hashing

\- Environment variables for secrets

\- No credentials committed to Git

\- Uploaded file validation

\- Restricted upload sizes

\- Database not directly exposed to Internet

\- Backend management API not trusted solely based on frontend controls



A user who obtains one walk link must not be able to enumerate other walks.



\---



\# 26. Offline / Connectivity Behavior



Walk recording should tolerate temporary network loss.



The PWA should maintain active walk state locally.



GPS points and events should be queued locally when the API cannot be reached.



When connectivity returns, queued data should synchronize with the backend.



The UI should clearly indicate synchronization state.



Example:



```text

Offline

17 GPS points waiting to sync

```



Perfect offline operation is not required for MVP, but temporary cellular loss must not destroy walk data.



\---



\# 27. PWA Requirements



The application must include:



\- Web App Manifest

\- Application icons

\- Standalone display mode

\- Mobile-responsive design

\- Service worker

\- Installable application behavior

\- HTTPS production deployment

\- Basic application-shell caching



Target browsers:



\- Safari/iOS PWA

\- Chromium desktop/mobile

\- Firefox desktop where functionality permits



Primary testing target is iPhone installed as a Home Screen PWA.



\---



\# 28. Frontend Architecture



Recommended:



\*\*React + TypeScript + Vite\*\*



Major routes:



```text

/login



/dashboard



/dogs

/dogs/:id



/walk/new

/walk/:id/live

/walk/:id/review

/walk/:id



/profile/edit



/w/:shareToken



/u/:username

```



Potential component structure:



```text

src/

├── components/

│   ├── Map/

│   ├── WalkTimer/

│   ├── EventButton/

│   ├── EventTimeline/

│   ├── PhotoGallery/

│   └── WalkStats/

│

├── pages/

│   ├── Dashboard/

│   ├── NewWalk/

│   ├── ActiveWalk/

│   ├── ReviewWalk/

│   ├── SharedWalk/

│   └── Profile/

│

├── services/

│   ├── api.ts

│   ├── geolocation.ts

│   └── sync.ts

│

└── types/

```



\---



\# 29. Backend Architecture



Recommended:



\*\*Python + FastAPI\*\*



Responsibilities:



\- Authentication

\- Walk management

\- Dog management

\- GPS ingestion

\- Event management

\- Photo uploads

\- Publication

\- Share-token resolution

\- Profile data

\- Authorization

\- Statistics



Example API structure:



```text

/api/auth/



/api/dogs/



/api/walks/



/api/walks/{id}/points



/api/walks/{id}/events



/api/walks/{id}/photos



/api/walks/{id}/finish



/api/walks/{id}/publish



/api/public/walks/{token}



/api/public/users/{username}

```



\---



\# 30. Database



Recommended:



\*\*PostgreSQL\*\*



Core entities:



```text

users

dogs

walks

gps\_points

walk\_events

photos

testimonials

```



Relationships:



```text

User

&#x20;|

&#x20;+---- Dogs

&#x20;|

&#x20;+---- Walks

&#x20;|       |

&#x20;|       +---- GPS Points

&#x20;|       |

&#x20;|       +---- Walk Events

&#x20;|       |

&#x20;|       +---- Photos

&#x20;|

&#x20;+---- Testimonials

```



\---



\# 31. Simplified Schema



\## users



```text

id

username

password\_hash

display\_name

bio

profile\_photo

created\_at

```



\## dogs



```text

id

user\_id

name

owner\_name

photo

notes

created\_at

```



\## walks



```text

id

user\_id

dog\_id

status

visibility

started\_at

ended\_at

distance\_meters

route\_source

notes

share\_token

created\_at

```



\## gps\_points



```text

id

walk\_id

timestamp

latitude

longitude

accuracy

altitude

speed

```



\## walk\_events



```text

id

walk\_id

type

timestamp

latitude

longitude

notes

```



\## photos



```text

id

walk\_id

timestamp

storage\_path

caption

```



\## testimonials



```text

id

user\_id

client\_name

rating

text

visible

created\_at

```



\---



\# 32. Mapping



Use an OpenStreetMap-compatible mapping solution.



The map must support:



\- Current position

\- Route polyline

\- Fit map to completed route

\- Client report route display



Map implementation should be abstracted enough that tile providers can be changed later.



\---



\# 33. Deployment Architecture



Initial production deployment:



```text

Internet

&#x20;   |

&#x20;   v

HTTPS / Reverse Proxy or Tunnel

&#x20;   |

&#x20;   v

Debian LXC

&#x20;   |

&#x20;   +-- Frontend

&#x20;   |

&#x20;   +-- FastAPI

&#x20;   |

&#x20;   +-- PostgreSQL

```



Containerized deployment may use:



```text

Docker Compose

├── frontend

├── backend

└── postgres

```



PostgreSQL must not expose its port publicly.



Development should run locally rather than requiring production deployment after every change.



\---



\# 34. Repository Structure



Recommended monorepo:



```text

dog-walker/

│

├── frontend/

│

├── backend/

│

├── docs/

│   └── PRD.md

│

├── docker-compose.yml

├── .env.example

├── .gitignore

└── README.md

```



Never commit the real `.env` file.



\---



\# 35. MVP Development Milestones



\## Milestone 1 — Foundation



Deliver:



\- Repository

\- React frontend

\- FastAPI backend

\- PostgreSQL

\- Authentication

\- Basic navigation

\- PWA manifest



Success:



Application can be installed/opened and authenticated.



\---



\## Milestone 2 — Walk Lifecycle



Deliver:



\- Dog creation

\- New Walk

\- Start Walk

\- Active Walk

\- Finish Walk

\- Walk history



Success:



A walk can move through:



```text

created -> active -> completed

```



without GPS.



\---



\## Milestone 3 — GPS



Deliver:



\- Browser geolocation

\- GPS point collection

\- Route map

\- Distance calculation

\- Accuracy filtering

\- Basic local buffering



Success:



A real outdoor walk produces a reasonably accurate route and distance.



\---



\## Milestone 4 — Walk Logging



Deliver:



\- Pee

\- Poop

\- Water

\- Fed

\- Notes

\- Event timeline

\- Editing/removal



Success:



Events can be recorded during a real walk without interrupting the walking experience.



\---



\## Milestone 5 — Photos



Deliver:



\- Mobile photo upload

\- Photo storage

\- Gallery

\- Remove photo



Success:



Photos taken during the walk appear in the completed report.



\---



\## Milestone 6 — Report \& Sharing



Deliver:



\- Review page

\- Publish action

\- Secure random share token

\- Client report

\- Copy link

\- Native share action where available



Success:



A walker can finish a walk and text the generated report URL to an owner.



\---



\## Milestone 7 — Public Profile



Deliver:



\- Walker profile

\- Bio

\- Photo

\- Aggregate statistics

\- Testimonials

\- Selected public walks



Success:



The walker has a usable public-facing profile.



\---



\## Milestone 8 — Real-World Testing



Perform multiple real dog walks.



Test:



\- Screen on

\- Screen locked

\- Application switching

\- Cellular connectivity loss

\- GPS inaccuracies

\- Long walks

\- Accidental refresh

\- PWA restart

\- Photo uploads

\- Sharing



Document limitations and bugs.



\---



\# 36. Definition of MVP Complete



The MVP is complete when the following can be performed reliably:



```text

Install PWA on phone

&#x20;       |

&#x20;       v

Login

&#x20;       |

&#x20;       v

Select dog

&#x20;       |

&#x20;       v

Start walk

&#x20;       |

&#x20;       v

Record GPS + events + photos

&#x20;       |

&#x20;       v

Finish walk

&#x20;       |

&#x20;       v

Review information

&#x20;       |

&#x20;       v

Publish

&#x20;       |

&#x20;       v

Generate private share link

&#x20;       |

&#x20;       v

Send link to dog owner

&#x20;       |

&#x20;       v

Owner views polished report

without creating an account

```



This workflow must work during an actual dog walk, not only in development testing.



\---



\# 37. Post-MVP Candidates



After the MVP has been validated:



\- PDF report generation

\- Owner accounts

\- Owner-submitted reviews

\- Expiring share links

\- Route privacy zones

\- Automatic home-location redaction

\- Push notifications

\- Live walk tracking

\- Scheduling

\- Calendar integration

\- Recurring walks

\- Payment processing

\- Invoicing

\- Multiple walkers

\- Business/team accounts

\- Weather

\- Advanced statistics

\- Native iOS/Android client

\- Client communication

\- Automatic walk summaries



These should not delay MVP release.



\## 37.1 Native Client Option



If foreground recording plus GPX import is not good enough in practice, the next step is a native shell around the existing React frontend, using the same backend API.



\- \*\*Framework:\*\* Capacitor (reuses the React/TypeScript code) or React Native/Expo.



\- \*\*Unlocks:\*\* background location with the screen off, and reading Apple Watch workout routes directly from HealthKit (no manual GPX export).



\- \*\*Building without a Mac:\*\* cloud macOS builders (Expo EAS, GitHub Actions macOS runners).



\- \*\*Cost:\*\* installing a custom build on an iPhone requires signing with a paid Apple Developer account ($99/year). Free provisioning needs Xcode on a Mac. Expo Go is free, but it can't run HealthKit or custom background-location code.



\- \*\*Garmin:\*\* direct sync goes through the Garmin Connect Developer Program (approval required; check current availability) or a paid aggregator (e.g. Terra). GPX import already covers Garmin for MVP.



Nothing in the MVP should block this. Keep business logic on the server and keep the API client-independent.



\---



\# 38. Product Principle



The application should not attempt to become a complete dog-walking business platform during the MVP.



Its core value proposition is:



> \*\*Record a dog's walk with minimal effort and turn it into a professional report the owner actually wants to receive.\*\*



Every MVP feature should directly support that workflow.

