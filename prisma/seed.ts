const { PrismaClient } = require('@prisma/client')
const { randomUUID } = require('crypto')

const prisma = new PrismaClient()

// Define our metric schemas as TypeScript types for better maintainability
type DenominationPreference = {
  denomination: 'Baptist' | 'Catholic' | 'Lutheran' | 'Methodist' | 'Presbyterian' | 'Non-Denominational' | 'Pentecostal' | 'Episcopal' | 'Orthodox'
  importance: 'Must Have' | 'Nice to Have' | 'Not Important'
  reason?: string
}

type WorshipStyle = {
  musicStyle: 'Traditional Hymns' | 'Contemporary' | 'Gospel' | 'Blended' | 'Contemplative'
  serviceFormat: 'Liturgical' | 'Contemporary' | 'Informal'
  importance: 'Must Have' | 'Nice to Have' | 'Not Important'
}

type Demographics = {
  ageGroup: '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+'
  householdType: 'Single' | 'Married' | 'Married with Children' | 'Single Parent' | 'Empty Nester'
  previousChurchBackground?: string
}

type LocationPreference = {
  latitude: number
  longitude: number
  maxDistance: number
  preferredArea: 'Urban' | 'Suburban' | 'Rural'
}

type CommunitySize = {
  size: 'Small (< 100)' | 'Medium (100-500)' | 'Large (500-2000)' | 'Mega (2000+)'
  importance: 'Must Have' | 'Nice to Have' | 'Not Important'
  reason?: string
}

async function main() {
  // Clean existing data
  await prisma.event.deleteMany()
  await prisma.metric.deleteMany()
  await prisma.profile.deleteMany()

  // Create metrics
  const [denominationMetric, worshipMetric, demographicsMetric, locationMetric, sizeMetric] = await Promise.all([
    prisma.metric.create({
      data: {
        name: 'Selected Denomination Preference',
        description: 'User indicates their preferred church denomination or tradition',
        schema: {
          type: 'object',
          properties: {
            denomination: {
              type: 'string',
              enum: ['Baptist', 'Catholic', 'Lutheran', 'Methodist', 'Presbyterian', 'Non-Denominational', 'Pentecostal', 'Episcopal', 'Orthodox']
            },
            importance: {
              type: 'string',
              enum: ['Must Have', 'Nice to Have', 'Not Important']
            },
            reason: {
              type: 'string'
            }
          },
          required: ['denomination', 'importance']
        }
      }
    }),
    prisma.metric.create({
      data: {
        name: 'Selected Worship Style',
        description: 'User indicates their preferred style of worship',
        schema: {
          type: 'object',
          properties: {
            musicStyle: {
              type: 'string',
              enum: ['Traditional Hymns', 'Contemporary', 'Gospel', 'Blended', 'Contemplative']
            },
            serviceFormat: {
              type: 'string',
              enum: ['Liturgical', 'Contemporary', 'Informal']
            },
            importance: {
              type: 'string',
              enum: ['Must Have', 'Nice to Have', 'Not Important']
            }
          },
          required: ['musicStyle', 'importance']
        }
      }
    }),
    prisma.metric.create({
      data: {
        name: 'Updated Demographics',
        description: 'User provides or updates their demographic information',
        schema: {
          type: 'object',
          properties: {
            ageGroup: {
              type: 'string',
              enum: ['18-24', '25-34', '35-44', '45-54', '55-64', '65+']
            },
            householdType: {
              type: 'string',
              enum: ['Single', 'Married', 'Married with Children', 'Single Parent', 'Empty Nester']
            },
            previousChurchBackground: {
              type: 'string'
            }
          },
          required: ['ageGroup', 'householdType']
        }
      }
    }),
    prisma.metric.create({
      data: {
        name: 'Set Location Preference',
        description: 'User sets their location and distance preferences',
        schema: {
          type: 'object',
          properties: {
            latitude: {
              type: 'number'
            },
            longitude: {
              type: 'number'
            },
            maxDistance: {
              type: 'number',
              description: 'Maximum distance in miles'
            },
            preferredArea: {
              type: 'string',
              enum: ['Urban', 'Suburban', 'Rural']
            }
          },
          required: ['latitude', 'longitude', 'maxDistance']
        }
      }
    }),
    prisma.metric.create({
      data: {
        name: 'Selected Community Size',
        description: 'User indicates their preferred church community size',
        schema: {
          type: 'object',
          properties: {
            size: {
              type: 'string',
              enum: ['Small (< 100)', 'Medium (100-500)', 'Large (500-2000)', 'Mega (2000+)']
            },
            importance: {
              type: 'string',
              enum: ['Must Have', 'Nice to Have', 'Not Important']
            },
            reason: {
              type: 'string'
            }
          },
          required: ['size', 'importance']
        }
      }
    })
  ])

  // Create profiles
  const [anonymousProfile, sarahProfile, michaelProfile] = await Promise.all([
    prisma.profile.create({
      data: {
        anonymousId: 'anon_123',
        isAnonymous: true,
        properties: {
          deviceType: 'mobile',
          firstVisit: new Date().toISOString(),
          referrer: 'google'
        }
      }
    }),
    prisma.profile.create({
      data: {
        email: 'sarah.jones@example.com',
        firstName: 'Sarah',
        lastName: 'Jones',
        isAnonymous: false,
        properties: {
          lastSearch: {
            latitude: 37.7749,
            longitude: -122.4194,
            city: 'San Francisco',
            state: 'CA'
          },
          preferences: {
            emailFrequency: 'weekly',
            pushNotifications: true
          }
        }
      }
    }),
    prisma.profile.create({
      data: {
        anonymousId: 'anon_456',
        email: 'michael.smith@example.com',
        firstName: 'Michael',
        lastName: 'Smith',
        isAnonymous: false,
        properties: {
          lastSearch: {
            latitude: 40.7128,
            longitude: -74.0060,
            city: 'New York',
            state: 'NY'
          },
          preferences: {
            emailFrequency: 'daily',
            pushNotifications: false
          }
        }
      }
    })
  ])

  // Create events for Sarah (complete profile)
  const sarahPreferences: Record<string, any> = {
    [denominationMetric.id]: {
      denomination: 'Non-Denominational',
      importance: 'Nice to Have',
      reason: 'Looking for a modern, flexible approach to worship'
    } as DenominationPreference,
    [worshipMetric.id]: {
      musicStyle: 'Contemporary',
      serviceFormat: 'Informal',
      importance: 'Must Have'
    } as WorshipStyle,
    [demographicsMetric.id]: {
      ageGroup: '25-34',
      householdType: 'Married with Children',
      previousChurchBackground: 'Baptist'
    } as Demographics,
    [locationMetric.id]: {
      latitude: 37.7749,
      longitude: -122.4194,
      maxDistance: 15,
      preferredArea: 'Urban'
    } as LocationPreference,
    [sizeMetric.id]: {
      size: 'Medium (100-500)',
      importance: 'Nice to Have',
      reason: 'Want to know people but not get lost in the crowd'
    } as CommunitySize
  }

  await Promise.all(
    Object.entries(sarahPreferences).map(([metricId, data]) =>
      prisma.event.create({
        data: {
          metricId,
          profileId: sarahProfile.id,
          data,
          timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random time in last 7 days
        }
      })
    )
  )

  // Create events for anonymous user (partial profile)
  const anonymousPreferences: Record<string, any> = {
    [denominationMetric.id]: {
      denomination: 'Catholic',
      importance: 'Must Have',
      reason: 'Strong connection to traditional liturgy'
    } as DenominationPreference,
    [worshipMetric.id]: {
      musicStyle: 'Traditional Hymns',
      serviceFormat: 'Liturgical',
      importance: 'Must Have'
    } as WorshipStyle,
    [locationMetric.id]: {
      latitude: 40.7128,
      longitude: -74.0060,
      maxDistance: 5,
      preferredArea: 'Urban'
    } as LocationPreference
  }

  await Promise.all(
    Object.entries(anonymousPreferences).map(([metricId, data]) =>
      prisma.event.create({
        data: {
          metricId,
          profileId: anonymousProfile.id,
          data,
          timestamp: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000) // Random time in last 3 days
        }
      })
    )
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 