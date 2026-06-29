# HomeHub — UI Flows & Design System

## Design Principles

- **Warm & Premium**: Soft gradients, rounded corners (16–24px), glassmorphism cards
- **Photography-first**: Large images, minimal chrome
- **Micro-interactions**: Haptics, spring animations, pull-to-refresh
- **Themes**: Light (warm cream) + Dark (deep charcoal with accent glow)

## Color Palette

### Light Mode
- Background: `#FAF8F5`
- Surface: `#FFFFFF`
- Primary: `#E8734A` (warm coral)
- Secondary: `#6B9AC4` (soft blue)
- Accent: `#9B7EDE` (lavender)
- Text Primary: `#1A1A2E`
- Text Secondary: `#6B7280`
- Success: `#34D399`
- Gradient Hero: `#E8734A → #F4A261 → #E9C46A`

### Dark Mode
- Background: `#0F0F14`
- Surface: `#1A1A24`
- Primary: `#FF8A65`
- Glass: `rgba(255,255,255,0.08)`
- Text Primary: `#F5F5F7`
- Gradient Hero: `#FF6B6B → #C084FC → #60A5FA`

## Typography

- **Display**: System rounded (SF Pro Rounded style) — 28–34px bold
- **Headline**: 20–24px semibold
- **Body**: 16px regular
- **Caption**: 13px medium, secondary color

## Component Library

| Component | Usage |
|-----------|-------|
| `GlassCard` | Floating cards with blur |
| `GradientHeader` | Tab screen headers |
| `AvatarRing` | Active member indicator |
| `ReactionBar` | Post reactions |
| `StreakBadge` | Photo streak display |
| `CountdownWidget` | Event countdown |
| `NewspaperSection` | Newspaper layout blocks |
| `MemoryGrid` | Photo grid with masonry |
| `GameCard` | Game selection tiles |
| `PlaylistCard` | Music playlist tile |
| `SpotCard` | Photo spot recommendation |
| `AchievementBadge` | Milestone badge |
| `FloatingTabBar` | Custom bottom navigation |

## Screen Flows

### Onboarding
```
Welcome → Auth Method → Profile Setup → Create/Join Family → Home
```

### Home Dashboard
```
Pull to refresh
├── Greeting + Weather
├── Family Streak Banner
├── Countdown to Next Event
├── Newspaper Preview (tap → full newspaper)
├── Today's Events (horizontal scroll)
├── Active Members (avatar row)
├── Now Playing (mini player)
├── Recent Uploads (grid)
└── Quick Actions (Upload, Challenge, Event, Assistant)
```

### Daily Challenge Flow
```
Memories Tab → Daily Challenge Card
├── Progress ring (X/6 members, your 2/2 photos)
├── Prompt suggestions (Morning coffee, Lunch, Sunset...)
├── Camera / Gallery upload
├── Family daily album preview
└── Streak celebration on completion
```

### Family Feed Flow
```
Memories → Feed
├── Stories row (tap → full screen story)
├── Posts (infinite scroll)
│   ├── Photo/video
│   ├── Reactions bar
│   └── Comments sheet
└── FAB → New Post (camera, gallery, album)
```

### Games Flow
```
Family Tab → Games Hub
├── Featured game carousel
├── Category grid (Trivia, Photo, Creative, Party)
├── Leaderboard preview
└── Tap game → Lobby → Play → Results → Badges
```

### AI Assistant Flow
```
Family Tab → AI Assistant
├── Suggested actions (chips)
├── Chat interface
├── Action cards (itinerary, collage, gift ideas)
└── History
```

## Animation Specs

- **Screen transitions**: 300ms ease-out
- **Card press**: scale 0.97 + light haptic
- **Tab switch**: crossfade 200ms
- **Pull refresh**: custom Lottie family icon
- **Streak fire**: pulsing gradient animation
- **Newspaper reveal**: page flip / slide up

## Accessibility

- Minimum touch target 44×44
- Dynamic type support
- High contrast mode option
- VoiceOver labels on all interactive elements
