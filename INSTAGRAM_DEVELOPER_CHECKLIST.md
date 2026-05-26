# Instagram Import - Developer Checklist

## 🎯 Pre-Implementation Checklist

- [ ] Read `INSTAGRAM_SETUP.md` for quick overview
- [ ] Have Instagram App ID and App Secret ready
- [ ] Have Meta Developers account set up
- [ ] Access to Supabase database
- [ ] Node.js and npm installed locally

## 🔧 Setup Phase (15 minutes)

### Environment Configuration
- [ ] Add `NEXT_PUBLIC_INSTAGRAM_APP_ID` to `.env.local`
- [ ] Add `INSTAGRAM_APP_SECRET` to `.env.local`
- [ ] Add `NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI` to `.env.local`
- [ ] Add `NEXT_PUBLIC_APP_URL` to `.env.local`
- [ ] Verify all env vars are set: `grep INSTAGRAM .env.local`

### Database Setup
- [ ] Open Supabase SQL Editor
- [ ] Copy contents of `INSTAGRAM_DB_MIGRATION.sql`
- [ ] Run migration script step by step
- [ ] Verify tables created:
  - [ ] `instagram_connections` table exists
  - [ ] `external_media` column in `journal_entries`
  - [ ] All indexes created
  - [ ] RLS policies enabled
- [ ] Check for errors: `SELECT * FROM information_schema.tables WHERE table_name = 'instagram_connections'`

### Application Integration
- [ ] Run `npm install` (if new dependencies added)
- [ ] Run `npm run dev` to start dev server
- [ ] Verify no TypeScript errors: `npm run lint`
- [ ] Check browser console for any issues

## ✅ Feature Testing Phase (20 minutes)

### Component Rendering
- [ ] [ ] Navigate to journal page
- [ ] [ ] Verify "Import from Instagram" button renders
- [ ] [ ] Verify button is clickable
- [ ] [ ] Modal opens when button clicked
- [ ] [ ] Modal displays connection state correctly

### OAuth Flow
- [ ] [ ] Click "Connect Instagram" button
- [ ] [ ] Redirected to Instagram login page
- [ ] [ ] Instagram authorization dialog appears
- [ ] [ ] After approval, redirected back to app
- [ ] [ ] Success message appears (if implemented)
- [ ] [ ] Token stored in database

### Media Loading
- [ ] [ ] Media grid appears after connection
- [ ] [ ] Images load successfully (or show placeholder)
- [ ] [ ] Media type badges display correctly (🖼️ 🎥 📚)
- [ ] [ ] Captions and dates show correctly
- [ ] [ ] "Load More" button appears
- [ ] [ ] Pagination works

### Media Selection
- [ ] [ ] Can click media to select
- [ ] [ ] Selection checkbox appears
- [ ] [ ] Visual feedback on selection (color change)
- [ ] [ ] Selection counter updates
- [ ] [ ] Can select multiple media
- [ ] [ ] Can deselect media

### Import Process
- [ ] [ ] Import button disabled until media selected
- [ ] [ ] Import button shows correct count
- [ ] [ ] Click import starts loading
- [ ] [ ] Loading state shows spinner
- [ ] [ ] Modal closes after import
- [ ] [ ] Journal entry updated with media
- [ ] [ ] Imported media displays in entry
- [ ] [ ] Links to Instagram posts work

## 🐛 Error Handling Testing (15 minutes)

### Network Errors
- [ ] [ ] Disconnect internet, try to load media
- [ ] [ ] Error message appears
- [ ] [ ] Retry button works
- [ ] [ ] Reconnect internet and verify recovery

### Authorization Errors
- [ ] [ ] Revoke Instagram app access
- [ ] [ ] Try to load media
- [ ] [ ] "Account not connected" error appears
- [ ] [ ] Re-connect and verify it works

### Invalid States
- [ ] [ ] Try to import with no media selected
- [ ] [ ] Import button remains disabled
- [ ] [ ] Try to import with invalid token
- [ ] [ ] Clear error message appears

## 📱 Responsive Design Testing (10 minutes)

- [ ] [ ] Test on desktop (1920px)
- [ ] [ ] Test on tablet (768px)
- [ ] [ ] Test on mobile (375px)
- [ ] [ ] Grid layout adapts correctly
- [ ] [ ] Buttons are touch-friendly
- [ ] [ ] Modal is readable on small screens
- [ ] [ ] No horizontal scrolling on mobile

## ⚡ Performance Testing (10 minutes)

- [ ] [ ] First load of media grid < 2 seconds
- [ ] [ ] Selecting media is instant
- [ ] [ ] Animations are smooth (60fps)
- [ ] [ ] Scrolling through media is smooth
- [ ] [ ] Load More pagination is fast
- [ ] [ ] Import completes in < 5 seconds

## 🔒 Security Verification (10 minutes)

- [ ] [ ] Tokens not exposed in browser console
- [ ] [ ] API calls use HTTPS in production
- [ ] [ ] User can't access other users' Instagram data
- [ ] [ ] User can't import to others' entries
- [ ] [ ] Environment variables not in git
- [ ] [ ] `.env.local` is in `.gitignore`

## 📊 Data Validation (10 minutes)

- [ ] [ ] Check Supabase for stored token
- [ ] [ ] Verify `instagram_connections` record created
- [ ] [ ] Check journal entry has `external_media` array
- [ ] [ ] Media objects have correct structure
- [ ] [ ] No sensitive data exposed in logs

## 🎨 UI/UX Polish (5 minutes)

- [ ] [ ] Animations are smooth and not distracting
- [ ] [ ] Loading states are clear
- [ ] [ ] Error messages are helpful
- [ ] [ ] Success feedback is provided
- [ ] [ ] No console errors or warnings
- [ ] [ ] Accessibility: Tab navigation works
- [ ] [ ] Accessibility: Screen reader friendly

## 📝 Documentation (5 minutes)

- [ ] [ ] Read `INSTAGRAM_IMPORT_GUIDE.md`
- [ ] [ ] Read `INSTAGRAM_INTEGRATION_EXAMPLE.tsx`
- [ ] [ ] Understand API endpoints
- [ ] [ ] Understand component props
- [ ] [ ] Know which hooks to use when

## 🚀 Deployment Preparation (10 minutes)

- [ ] [ ] Update production env vars in hosting
- [ ] [ ] Update Instagram app redirect URI for production domain
- [ ] [ ] Run production build: `npm run build`
- [ ] [ ] Test for build errors
- [ ] [ ] Verify no warnings in build output
- [ ] [ ] Check deployed app is working
- [ ] [ ] Monitor error logs after deployment

## 📈 Advanced Testing (Optional)

- [ ] [ ] Test with 100+ Instagram posts
- [ ] [ ] Test with carousel albums
- [ ] [ ] Test with videos
- [ ] [ ] Test rapid selection/deselection
- [ ] [ ] Test on slow internet connection
- [ ] [ ] Test with very long captions
- [ ] [ ] Test browser refresh during import
- [ ] [ ] Test back button in browser

## 🔍 Code Review Checklist

- [ ] [ ] All TypeScript types are correct
- [ ] [ ] No `any` types used
- [ ] [ ] All functions have JSDoc comments
- [ ] [ ] Error handling present in all functions
- [ ] [ ] No console.log left in production code
- [ ] [ ] Component props properly typed
- [ ] [ ] API responses are validated
- [ ] [ ] No hardcoded values or secrets

## 💾 Backup & Rollback (Before going live)

- [ ] [ ] Backup existing journal_entries table
- [ ] [ ] Test rollback script works
- [ ] [ ] Have recovery plan documented
- [ ] [ ] Know how to revert database changes
- [ ] [ ] Know how to disable Instagram feature

## 🎉 Launch Checklist

- [ ] [ ] All tests passed
- [ ] [ ] Performance acceptable
- [ ] [ ] No security issues
- [ ] [ ] Documentation updated
- [ ] [ ] Team trained on feature
- [ ] [ ] Support team aware
- [ ] [ ] Monitoring set up
- [ ] [ ] Ready for production!

---

## Quick Commands

```bash
# Verify all files exist
bash verify-instagram-implementation.sh

# Run TypeScript check
npm run lint

# Build for production
npm run build

# Check env vars
grep INSTAGRAM .env.local

# View Supabase tables
# Visit Supabase dashboard > Database > Tables
```

## Emergency Procedures

### If OAuth Flow Breaks
1. Verify App ID and Secret are correct
2. Check redirect URI matches exactly
3. Clear browser cookies
4. Try incognito window
5. Contact Meta support if persists

### If Media Won't Load
1. Check user Instagram account is public/semi-public
2. Verify access token is valid
3. Check token hasn't expired
4. Ensure posts aren't deleted
5. Check rate limiting hasn't been hit

### If Import Fails
1. Verify user owns the journal entry
2. Check database permissions
3. Verify external_media column exists
4. Check Supabase logs for errors
5. Restart dev server

## Support Resources

- 📖 Full Guide: `INSTAGRAM_IMPORT_GUIDE.md`
- ⚡ Quick Setup: `INSTAGRAM_SETUP.md`
- 💡 Example Code: `INSTAGRAM_INTEGRATION_EXAMPLE.tsx`
- 📊 Summary: `INSTAGRAM_IMPLEMENTATION_SUMMARY.md`
- 🗄️ Database: `INSTAGRAM_DB_MIGRATION.sql`

---

**Status: Ready for Implementation** ✅

All files have been created and are ready to use. Start with the Quick Setup guide and work through this checklist systematically.

Last Updated: 2024-05-24
