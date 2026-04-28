import type { ReviewInput } from '../src/lib/review-prompt.js'

export type Fixture = {
  id: string
  label: string
  expected_keywords: string[] // lowercase substrings the review should mention
  expected_tone: 'celebratory' | 'compassionate' | 'motivating' | 'neutral'
  input: ReviewInput
}

export const FIXTURES: Fixture[] = [
  {
    id: 'productive-day',
    label: 'Highly productive workday with all habits',
    expected_keywords: ['9', 'focus', 'momentum'],
    expected_tone: 'celebratory',
    input: {
      userName: 'Sharon',
      tasks: [
        { text: 'Ship Q2 planning doc', category: 'WORK', done: true },
        { text: 'Code review for team', category: 'WORK', done: true },
        { text: 'Respond to client thread', category: 'WORK', done: true },
        { text: '30-min run', category: 'HEALTH', done: true },
        { text: 'Meal prep for the week', category: 'HEALTH', done: true },
        { text: 'Read 20 pages', category: 'PERSONAL', done: true },
        { text: 'Pay utilities', category: 'PERSONAL', done: true },
        { text: 'Call mom', category: 'PERSONAL', done: true },
        { text: 'Update LinkedIn', category: 'OTHER', done: true },
        { text: 'Plan weekend trip', category: 'OTHER', done: false },
      ],
      goals: [
        { text: 'Run a half-marathon', progress: 60 },
        { text: 'Ship Dayflow v2', progress: 75 },
      ],
      habits: [
        { name: 'Meditate', doneToday: true },
        { name: 'No phone after 10pm', doneToday: true },
        { name: 'Drink 2L water', doneToday: true },
      ],
      journalText: 'Felt locked in today. Got into deep work for 3 hours straight in the morning, no interruptions. Excited about how the planning doc came out.',
    },
  },
  {
    id: 'burnout-day',
    label: 'Sad/exhausted, very few tasks done',
    expected_keywords: ['rest', 'gentle', 'tomorrow'],
    expected_tone: 'compassionate',
    input: {
      userName: 'Sharon',
      tasks: [
        { text: 'Finish design spec', category: 'WORK', done: false },
        { text: 'Reply to 3 emails', category: 'WORK', done: true },
        { text: 'Standup prep', category: 'WORK', done: false },
        { text: 'Gym', category: 'HEALTH', done: false },
        { text: 'Cook dinner', category: 'HEALTH', done: false },
        { text: 'Journal', category: 'PERSONAL', done: true },
        { text: 'Read', category: 'PERSONAL', done: false },
        { text: 'Plan trip', category: 'OTHER', done: false },
      ],
      goals: [{ text: 'Ship Dayflow v2', progress: 40 }],
      habits: [
        { name: 'Meditate', doneToday: false },
        { name: 'Drink 2L water', doneToday: false },
      ],
      journalText: 'Exhausted. Couldn\'t focus all day. Feeling really burnt out and not sure why. Just want to sleep.',
    },
  },
  {
    id: 'balanced-day',
    label: 'Solid mid-tier day with mixed categories',
    expected_keywords: ['balance', 'consistent'],
    expected_tone: 'motivating',
    input: {
      userName: 'Sharon',
      tasks: [
        { text: 'Sprint review', category: 'WORK', done: true },
        { text: 'Code review', category: 'WORK', done: true },
        { text: 'Walk', category: 'HEALTH', done: true },
        { text: 'Cook dinner', category: 'HEALTH', done: true },
        { text: 'Pay rent', category: 'PERSONAL', done: true },
        { text: 'Read', category: 'PERSONAL', done: false },
        { text: 'Email replies', category: 'WORK', done: false },
        { text: 'Plan dentist', category: 'OTHER', done: false },
      ],
      goals: [{ text: 'Read 12 books this year', progress: 33 }],
      habits: [
        { name: 'Meditate', doneToday: true },
        { name: 'Stretch', doneToday: false },
      ],
      journalText: 'Decent day. Not amazing, not bad. Got through the important stuff.',
    },
  },
  {
    id: 'weekend-rest',
    label: 'Light Saturday focused on rest',
    expected_keywords: ['rest', 'recharge'],
    expected_tone: 'celebratory',
    input: {
      userName: 'Sharon',
      tasks: [
        { text: 'Sleep in', category: 'PERSONAL', done: true },
        { text: 'Brunch with friends', category: 'PERSONAL', done: true },
        { text: 'Walk in park', category: 'HEALTH', done: true },
      ],
      goals: [],
      habits: [{ name: 'No work email on weekends', doneToday: true }],
      journalText: 'Lovely slow day. Coffee, friends, sunshine. This is what weekends should feel like.',
    },
  },
  {
    id: 'sick-day',
    label: 'Sick, unable to work',
    expected_keywords: ['recover', 'rest'],
    expected_tone: 'compassionate',
    input: {
      userName: 'Sharon',
      tasks: [
        { text: 'Finish proposal', category: 'WORK', done: false },
        { text: 'Call dentist', category: 'PERSONAL', done: false },
        { text: 'Workout', category: 'HEALTH', done: false },
        { text: 'Drink fluids', category: 'HEALTH', done: true },
      ],
      goals: [{ text: 'Ship Dayflow v2', progress: 50 }],
      habits: [
        { name: 'Meditate', doneToday: false },
        { name: 'Stretch', doneToday: false },
      ],
      journalText: 'Bad cold. Couldn\'t do much. Slept most of the day.',
    },
  },
  {
    id: 'work-crunch',
    label: 'All work, no balance',
    expected_keywords: ['balance', 'work'],
    expected_tone: 'motivating',
    input: {
      userName: 'Sharon',
      tasks: [
        { text: 'Review PR #1234', category: 'WORK', done: true },
        { text: 'Fix prod bug', category: 'WORK', done: true },
        { text: 'Status update for VP', category: 'WORK', done: true },
        { text: 'Sprint planning', category: 'WORK', done: true },
        { text: 'On-call rotation', category: 'WORK', done: true },
      ],
      goals: [{ text: 'Ship Dayflow v2', progress: 80 }],
      habits: [
        { name: 'Meditate', doneToday: false },
        { name: 'Stretch', doneToday: false },
        { name: 'Drink 2L water', doneToday: false },
      ],
      journalText: 'Crushing on work this week. No time for anything else but the launch is close.',
    },
  },
  {
    id: 'goal-stalled',
    label: 'Tasks fine but long-term goals stuck',
    expected_keywords: ['goal', 'progress'],
    expected_tone: 'motivating',
    input: {
      userName: 'Sharon',
      tasks: [
        { text: 'Email triage', category: 'WORK', done: true },
        { text: 'Lunch walk', category: 'HEALTH', done: true },
        { text: 'Cook dinner', category: 'HEALTH', done: true },
      ],
      goals: [
        { text: 'Run a half-marathon', progress: 5 },
        { text: 'Read 12 books this year', progress: 8 },
        { text: 'Learn Spanish', progress: 0 },
      ],
      habits: [{ name: 'Stretch', doneToday: true }],
      journalText: 'Going through the motions. Goals feel really far away right now.',
    },
  },
  {
    id: 'first-day',
    label: 'Brand new user, mostly empty state',
    expected_keywords: ['start', 'tomorrow'],
    expected_tone: 'motivating',
    input: {
      userName: null,
      tasks: [{ text: 'Set up Dayflow', category: 'OTHER', done: true }],
      goals: [],
      habits: [],
      journalText: null,
    },
  },
  {
    id: 'streak-broken',
    label: 'Habits skipped after long streak',
    expected_keywords: ['streak', 'tomorrow'],
    expected_tone: 'compassionate',
    input: {
      userName: 'Sharon',
      tasks: [
        { text: 'Standup', category: 'WORK', done: true },
        { text: 'Code review', category: 'WORK', done: true },
        { text: 'Workout', category: 'HEALTH', done: false },
        { text: 'Meal prep', category: 'HEALTH', done: false },
      ],
      goals: [{ text: 'Run a half-marathon', progress: 60 }],
      habits: [
        { name: 'Meditate (32-day streak)', doneToday: false },
        { name: 'No phone after 10pm', doneToday: false },
      ],
      journalText: 'Off day. Skipped meditation for the first time in a month. Feeling a bit guilty but also tired.',
    },
  },
  {
    id: 'all-personal',
    label: 'Day off — all health and personal tasks',
    expected_keywords: ['care', 'health'],
    expected_tone: 'celebratory',
    input: {
      userName: 'Sharon',
      tasks: [
        { text: 'Long run', category: 'HEALTH', done: true },
        { text: 'Stretch session', category: 'HEALTH', done: true },
        { text: 'Therapy', category: 'HEALTH', done: true },
        { text: 'Read', category: 'PERSONAL', done: true },
        { text: 'Cook proper meal', category: 'PERSONAL', done: true },
      ],
      goals: [{ text: 'Run a half-marathon', progress: 70 }],
      habits: [
        { name: 'Meditate', doneToday: true },
        { name: 'Stretch', doneToday: true },
      ],
      journalText: 'PTO day. Took care of myself. Feel reset.',
    },
  },
  {
    id: 'mixed-overwhelm',
    label: 'Too many tasks, low completion, anxious',
    expected_keywords: ['overwhelm', 'priorit'],
    expected_tone: 'compassionate',
    input: {
      userName: 'Sharon',
      tasks: [
        { text: 'PR review', category: 'WORK', done: true },
        { text: 'Standup', category: 'WORK', done: true },
        { text: 'Design doc', category: 'WORK', done: false },
        { text: 'Q2 planning', category: 'WORK', done: false },
        { text: 'Reply to VP', category: 'WORK', done: false },
        { text: 'Workout', category: 'HEALTH', done: false },
        { text: 'Cook dinner', category: 'HEALTH', done: false },
        { text: 'Pay bills', category: 'PERSONAL', done: true },
        { text: 'Call dentist', category: 'PERSONAL', done: false },
        { text: 'Plan trip', category: 'OTHER', done: false },
        { text: 'Update CV', category: 'OTHER', done: false },
        { text: 'Tax docs', category: 'OTHER', done: false },
      ],
      goals: [{ text: 'Ship Dayflow v2', progress: 50 }],
      habits: [{ name: 'Meditate', doneToday: false }],
      journalText: 'Spinning plates. List too long. Anxious. Don\'t know where to start tomorrow.',
    },
  },
  {
    id: 'quiet-win',
    label: 'Few tasks, all done, quiet satisfaction',
    expected_keywords: ['focused', 'enough'],
    expected_tone: 'celebratory',
    input: {
      userName: 'Sharon',
      tasks: [
        { text: 'Deep work block on design doc', category: 'WORK', done: true },
        { text: 'Yoga', category: 'HEALTH', done: true },
        { text: 'Make dinner', category: 'HEALTH', done: true },
      ],
      goals: [{ text: 'Ship Dayflow v2', progress: 65 }],
      habits: [
        { name: 'Meditate', doneToday: true },
        { name: 'Stretch', doneToday: true },
      ],
      journalText: 'Less is more day. Three things, all done well.',
    },
  },
]
