import { useEffect, useMemo, useState, useCallback } from 'react'
import * as XLSX from 'xlsx-js-style'
import { useNavigate, Link } from 'react-router-dom'
import { supabase, TRIBES } from '../lib/supabaseClient.js'
import TribeBadge from '../components/TribeBadge.jsx'
import Loader from '../components/Loader.jsx'

const EMPTY_FORM = { question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'a' }

export default function SageDashboard() {
  const navigate = useNavigate()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [activity, setActivity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [savingActivity, setSavingActivity] = useState(false)
  const [members, setMembers] = useState([])
  const [activityResponses, setActivityResponses] = useState([])
  const [bulkText, setBulkText] = useState('')
  const [bulkTribe, setBulkTribe] = useState('mapuche')
  const [singleName, setSingleName] = useState('')
  const [singleTribe, setSingleTribe] = useState('mapuche')
  const [notice, setNotice] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [revealStage, setRevealStage] = useState(1)
  const [responsesForResults, setResponsesForResults] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { navigate('/sabio') } else { setCheckingAuth(false) }
    })
  }, [navigate])

  const loadMembers = useCallback(async () => {
    const { data } = await supabase.from('tribe_members').select('id, name, tribe').order('tribe', { ascending: true }).order('name', { ascending: true })
    setMembers(data || [])
  }, [])

  const loadActivity = useCallback(async () => {
    setLoading(true)
    const { data: acts } = await supabase.from('activities').select('*').order('created_at', { ascending: false }).limit(1)
    const current = acts && acts[0] ? acts[0] : null
    setActivity(current)
    if (current) {
      setForm({ question: current.question || '', option_a: current.option_a || '', option_b: current.option_b || '', option_c: current.option_c || '', option_d: current.option_d || '', correct_option: current.correct_option || 'a' })
      if (current.status === 'active') await loadActivityResponses(current.id)
    }
    await loadMembers()
    setLoading(false)
  }, [loadMembers])

  const loadActivityResponses = useCallback(async (activityId) => {
    const { data } = await supabase.from('member_responses').select('member_id').eq('activity_id', activityId)
    setActivityResponses(data || [])
  }, [])

  useEffect(() => { if (!checkingAuth) loadActivity() }, [checkingAuth, loadActivity])

  useEffect(() => {
    if (!activity || activity.status !== 'active') return
    const channel = supabase.channel(`activity-${activity.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'member_responses', filter: `activity_id=eq.${activity.id}` }, () => loadActivityResponses(activity.id))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [activity,
