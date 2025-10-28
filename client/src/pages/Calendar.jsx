import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { postsAPI } from '../services/api'

export default function Calendar() {
  const { user } = useUser()
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.id) {
      loadScheduledPosts()
    }
  }, [user])

  const loadScheduledPosts = async () => {
    try {
      const response = await postsAPI.getScheduled(user.id)
      const posts = response.data || []
      
      // Get current date at start of day for comparison
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      // Group posts by date and create date markers instead of individual events
      const postsByDate = {}
      posts.forEach(post => {
        const postDate = new Date(post.scheduledTime)
        const date = postDate.toISOString().split('T')[0]
        
        // Only include posts scheduled for today or future dates
        if (postDate >= today) {
          if (!postsByDate[date]) {
            postsByDate[date] = []
          }
          postsByDate[date].push(post)
        }
      })
      
      // Create events for dates with posts (no titles, just colored backgrounds)
      const dateEvents = Object.keys(postsByDate).map(date => {
        const datePosts = postsByDate[date]
        const hasScheduled = datePosts.some(p => p.status === 'scheduled')
        const hasPosted = datePosts.some(p => p.status === 'posted')
        const hasFailed = datePosts.some(p => p.status === 'failed')
        
        let backgroundColor = '#e5e7eb' // default gray
        if (hasFailed) backgroundColor = '#fca5a5' // light red
        else if (hasScheduled) backgroundColor = '#93c5fd' // light blue
        else if (hasPosted) backgroundColor = '#86efac' // light green
        
        return {
          id: `date-${date}`,
          title: '', // No title to hide details
          start: date,
          allDay: true,
          display: 'background',
          backgroundColor,
          extendedProps: {
            postCount: datePosts.length,
            hasScheduled,
            hasPosted,
            hasFailed
          }
        }
      })
      
      setEvents(dateEvents)
    } catch (error) {
      console.error('Error loading posts:', error)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  const handleDateClick = (dateInfo) => {
    const selectedDate = dateInfo.dateStr
    navigate(`/day/${selectedDate}`)
  }

  const handleEventClick = (clickInfo) => {
    // Background events don't need special handling, let dateClick handle it
    clickInfo.jsEvent.stopPropagation()
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Header Section */}
        <div className="mb-4 flex-shrink-0">
          <h1 className="text-2xl font-semibold text-gray-900">Content Calendar</h1>
          <p className="mt-1 text-sm text-gray-500">View and manage your scheduled posts</p>
        </div>
        
        {loading ? (
          <div className="flex-1 flex items-center justify-center bg-white rounded-xl border border-gray-200">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <p className="mt-3 text-sm text-gray-600">Loading calendar...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Calendar */}
            <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col min-h-0">
              <style>{`
                .fc {
                  font-family: inherit;
                  height: 100%;
                  display: flex;
                  flex-direction: column;
                }
                .fc .fc-view-harness {
                  flex: 1;
                  min-height: 0;
                  overflow: hidden;
                }
                .fc .fc-daygrid-body {
                  height: 100%;
                }
                .fc .fc-scrollgrid-sync-table {
                  height: 100%;
                }
                .fc .fc-toolbar-title {
                  font-size: 1.25rem;
                  font-weight: 600;
                  color: #111827;
                }
                .fc .fc-button {
                  background-color: white;
                  border: 1px solid #e5e7eb;
                  color: #374151;
                  padding: 0.5rem 1rem;
                  font-size: 0.875rem;
                  font-weight: 500;
                  text-transform: capitalize;
                  box-shadow: none;
                  transition: all 0.15s ease;
                }
                .fc .fc-button:hover {
                  background-color: #f9fafb;
                  border-color: #d1d5db;
                }
                .fc .fc-button:focus {
                  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                  outline: none;
                }
                .fc .fc-button-active {
                  background-color: #3b82f6 !important;
                  border-color: #3b82f6 !important;
                  color: white !important;
                }
                .fc .fc-button-primary:disabled {
                  background-color: #f3f4f6;
                  border-color: #e5e7eb;
                  color: #9ca3af;
                  opacity: 1;
                }
                .fc-theme-standard td,
                .fc-theme-standard th {
                  border-color: #f3f4f6;
                }
                .fc .fc-daygrid-day {
                  cursor: pointer;
                  transition: background-color 0.15s ease;
                }
                .fc .fc-daygrid-day:hover {
                  background-color: #f9fafb;
                }
                .fc .fc-daygrid-day-number {
                  padding: 0.5rem;
                  font-size: 0.875rem;
                  color: #374151;
                  font-weight: 500;
                }
                .fc .fc-day-today {
                  background-color: #eff6ff !important;
                }
                .fc .fc-day-today .fc-daygrid-day-number {
                  color: #2563eb;
                  font-weight: 600;
                }
                .fc .fc-col-header-cell {
                  background-color: #f9fafb;
                  padding: 0.75rem 0;
                  font-weight: 600;
                  font-size: 0.75rem;
                  text-transform: uppercase;
                  letter-spacing: 0.05em;
                  color: #6b7280;
                  border-color: #f3f4f6;
                }
                .fc .fc-scrollgrid {
                  border-color: #f3f4f6;
                  height: 100%;
                }
                .fc-daygrid-day-frame {
                  min-height: auto;
                }
              `}</style>
              <div className="p-4 flex-1 flex flex-col min-h-0">
                <FullCalendar
                  plugins={[dayGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  events={events}
                  dateClick={handleDateClick}
                  eventClick={handleEventClick}
                  selectable={false}
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: ''
                  }}
                  height="100%"
                  dayMaxEvents={false}
                  fixedWeekCount={false}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}