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
      const postEvents = posts.map(post => ({
        id: post._id,
        title: post.content.substring(0, 30) + (post.content.length > 30 ? '...' : ''),
        start: post.scheduledTime,
        extendedProps: {
          content: post.content,
          status: post.status
        },
        backgroundColor: post.status === 'failed' ? '#ef4444' : '#3b82f6'
      }))
      setEvents(postEvents)
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
    // Prevent event propagation to avoid triggering dateClick
    clickInfo.jsEvent.stopPropagation()
    
    const { content, status } = clickInfo.event.extendedProps
    const eventDate = clickInfo.event.start.toISOString().split('T')[0]
    
    // Navigate to day view for the event's date
    navigate(`/day/${eventDate}`)
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
      
      <div className="mt-6 text-sm text-gray-600">
        <p>• Click on any date to view and manage posts for that day</p>
        <p>• Click on existing posts to see details</p>
      </div>
    </div>
  )
}