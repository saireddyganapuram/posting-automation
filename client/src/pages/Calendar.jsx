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
      
      // Group posts by date and create date markers instead of individual events
      const postsByDate = {}
      posts.forEach(post => {
        const date = new Date(post.scheduledTime).toISOString().split('T')[0]
        if (!postsByDate[date]) {
          postsByDate[date] = []
        }
        postsByDate[date].push(post)
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
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Post Calendar</h1>
      
      {loading ? (
        <div className="text-center py-8">Loading scheduled posts...</div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
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
              right: 'dayGridMonth'
            }}
            height="auto"
          />
        </div>
      )}
      
      <div className="mt-6">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-300 rounded"></div>
            <span>Scheduled Posts</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-300 rounded"></div>
            <span>Posted</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-300 rounded"></div>
            <span>Failed Posts</span>
          </div>
        </div>
        <p className="text-gray-600 mt-2">• Click on any date to view and manage posts for that day</p>
      </div>
    </div>
  )
}