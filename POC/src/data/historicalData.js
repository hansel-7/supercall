export const previousCalls = [
  {
    id: 'call-001',
    date: '2026-02-28',
    duration: '42 min',
    type: 'Initial Pitch',
    summary:
      'First meeting between Meridian Ventures and NovaPay. Alex presented the Series A deck covering the B2B payment compliance platform. Sarah expressed strong interest in the regulatory moat and asked for follow-up materials on ARR growth trajectory.',
    keyDiscussionPoints: [
      'Product demo of compliance dashboard',
      'ARR at $1.8M, growing 15% MoM',
      'Team of 22, looking to hire VP Engineering',
      'Initial valuation discussion: $25-30M range',
      'Burn rate at $280K/month',
    ],
    actionItems: [
      { text: 'Send updated pitch deck with Q1 financials', completed: true },
      { text: 'Provide customer reference list', completed: true },
      { text: 'Share technical architecture doc', completed: true },
      { text: 'Schedule follow-up in 2-3 weeks', completed: true },
    ],
    sentiment: {
      vcInterest: 72,
      founderConfidence: 80,
    },
  },
  {
    id: 'call-002',
    date: '2026-02-15',
    duration: '15 min',
    type: 'Intro Call',
    summary:
      'Brief introductory call. Sarah reached out after seeing NovaPay featured in a TechCrunch article about emerging fintech compliance tools. Scheduled a full pitch meeting.',
    keyDiscussionPoints: [
      'High-level overview of NovaPay',
      'Meridian Ventures fintech thesis alignment',
      'Agreed to schedule full pitch',
    ],
    actionItems: [
      { text: 'Send pitch deck ahead of meeting', completed: true },
    ],
    sentiment: {
      vcInterest: 55,
      founderConfidence: 70,
    },
  },
];

export const keyMetrics = {
  current: {
    arr: '$2.4M',
    mrr: '$200K',
    runway: '14 months',
    burnRate: '$310K/mo',
    teamSize: 25,
    nrr: '127%',
    grossRetention: '94%',
    acv: '$72K',
  },
  previousCall: {
    arr: '$1.8M',
    mrr: '$150K',
    runway: '18 months',
    burnRate: '$280K/mo',
    teamSize: 22,
    nrr: '118%',
    grossRetention: '92%',
    acv: '$45K',
  },
  changes: {
    arr: { delta: '+33%', direction: 'up' },
    mrr: { delta: '+33%', direction: 'up' },
    runway: { delta: '-4 months', direction: 'down' },
    burnRate: { delta: '+$30K', direction: 'up' },
    teamSize: { delta: '+3', direction: 'up' },
    nrr: { delta: '+9pp', direction: 'up' },
    acv: { delta: '+60%', direction: 'up' },
  },
};
