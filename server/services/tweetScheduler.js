const axios = require('axios');
const fs = require('fs');
const path = require('path');
const Post = require('../models/Post');
const User = require('../models/User');
const LinkedInAccount = require('../models/LinkedInAccount');

// Function to fetch and update LinkedIn member URN
async function refreshLinkedInMemberUrn(linkedinAccount) {
  try {
    const response = await axios.get('https://api.linkedin.com/v2/me', {
      headers: { 'Authorization': `Bearer ${linkedinAccount.linkedinAccessToken}` }
    });
    
    const userId = response.data.id;
    const memberUrn = `urn:li:person:${userId}`;
    console.log('Refreshed LinkedIn member URN:', memberUrn);
    
    // Update LinkedInAccount with new URN
    if (linkedinAccount._id) {
      await LinkedInAccount.findByIdAndUpdate(
        linkedinAccount._id,
        { linkedinMemberUrn: memberUrn }
      );
    } else {
      // Fallback for legacy user model
      await User.findOneAndUpdate(
        { clerkId: linkedinAccount.clerkId },
        { linkedinMemberUrn: memberUrn }
      );
    }
    
    return memberUrn;
  } catch (error) {
    console.error('Failed to refresh LinkedIn member URN:', error.response?.data || error.message);
    return null;
  }
}

// Function to post to a specific LinkedIn account
async function postToLinkedInAccount(post, linkedinAccount) {
  let memberUrn = linkedinAccount.linkedinMemberUrn;
  if (!memberUrn) {
    memberUrn = await refreshLinkedInMemberUrn(linkedinAccount);
    if (!memberUrn) {
      throw new Error('LinkedIn member URN not found');
    }
  }
  
  // Handle image upload if needed
  let assetUrn = null;
  if (post.hasImage && post.imageUrl) {
    const imagePath = path.join(__dirname, '..', post.imageUrl.replace('/uploads/', 'uploads/'));
    if (fs.existsSync(imagePath)) {
      assetUrn = await uploadImageToLinkedIn(imagePath, linkedinAccount.linkedinAccessToken, memberUrn);
      if (!assetUrn) {
        throw new Error('Failed to upload image');
      }
    }
  }
  
  // Create post data
  const postData = {
    author: memberUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: post.content },
        shareMediaCategory: assetUrn ? 'IMAGE' : 'NONE'
      }
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
  };
  
  if (assetUrn) {
    postData.specificContent['com.linkedin.ugc.ShareContent'].media = [{
      status: 'READY',
      description: { text: 'Generated image for LinkedIn post' },
      media: assetUrn,
      title: { text: 'Post Image' }
    }];
  }
  
  // Post to LinkedIn
  const response = await axios.post('https://api.linkedin.com/v2/ugcPosts', postData, {
    headers: {
      'Authorization': `Bearer ${linkedinAccount.linkedinAccessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0'
    }
  });
  
  console.log(`✅ Posted to ${linkedinAccount.linkedinName}: ${response.data.id}`);
  return response.data.id;
}

// Function to upload image to LinkedIn
async function uploadImageToLinkedIn(imagePath, accessToken, memberUrn) {
  try {
    console.log('Starting LinkedIn image upload process...');
    
    // Step 1: Register upload
    const registerResponse = await axios.post(
      'https://api.linkedin.com/v2/assets?action=registerUpload',
      {
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: memberUrn,
          serviceRelationships: [
            {
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent'
            }
          ]
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Register response:', JSON.stringify(registerResponse.data, null, 2));
    
    // Extract uploadUrl correctly from the response
    const uploadUrl = registerResponse.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
    const asset = registerResponse.data.value.asset;
    
    console.log('Upload registration successful, asset URN:', asset);
    console.log('Upload URL:', uploadUrl);

    // Step 2: Upload image bytes
    const imageBuffer = fs.readFileSync(imagePath);
    const contentType = imagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    console.log('Content-Type:', contentType);
    console.log('Buffer length:', imageBuffer.length);
    
    // Upload raw bytes without Authorization header
    const uploadResponse = await axios.put(uploadUrl, imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': imageBuffer.length
      }
    });
    console.log('Upload response status:', uploadResponse.status);

    console.log('✅ Image upload successful, asset URN:', asset);
    return asset;
  } catch (error) {
    console.error('LinkedIn image upload failed:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Response status:', error.response?.status);
    console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Request config:', error.config?.url);
    return null;
  }
}

async function checkAndPostScheduledPosts() {
  try {
    const now = new Date();
    console.log(`=== LinkedIn Post Scheduler Check at ${now.toISOString()} ===`);
    
    const postsToPost = await Post.find({
      status: 'scheduled',
      scheduledTime: { $lte: now }
    });

    console.log(`Found ${postsToPost.length} posts to post`);

    if (postsToPost.length === 0) {
      return;
    }

    for (const post of postsToPost) {
      try {
        console.log(`Processing post ${post._id}: "${post.content}"`);
        console.log(`Scheduled for: ${post.scheduledTime}`);
        
        const user = await User.findOne({ clerkId: post.userId });
        
        if (!user) {
          console.log(`User not found for clerkId: ${post.userId}`);
          await Post.findByIdAndUpdate(post._id, {
            status: 'failed',
            errorMessage: 'User not found'
          });
          continue;
        }

        // Handle multi-account posts
        if (post.isMultiAccount && post.linkedinAccountIds?.length > 0) {
          // Post to multiple accounts
          const accounts = await LinkedInAccount.find({ 
            _id: { $in: post.linkedinAccountIds },
            isActive: true 
          });
          
          let successCount = 0;
          const postResults = [];
          
          for (const account of accounts) {
            try {
              await postToLinkedInAccount(post, account);
              postResults.push({ accountId: account._id, status: 'posted', postedAt: new Date() });
              successCount++;
            } catch (error) {
              console.error(`Failed to post to account ${account.linkedinName}:`, error.message);
              postResults.push({ 
                accountId: account._id, 
                status: 'failed', 
                errorMessage: error.message 
              });
            }
          }
          
          // Update post with results
          await Post.findByIdAndUpdate(post._id, {
            status: successCount > 0 ? 'posted' : 'failed',
            postedAccounts: postResults,
            errorMessage: successCount === 0 ? 'Failed to post to all accounts' : null
          });
          
          console.log(`Multi-account post completed: ${successCount}/${accounts.length} successful`);
          continue;
        }
        
        // Single account post logic
        let linkedinAccount;
        if (post.linkedinAccountId) {
          linkedinAccount = await LinkedInAccount.findById(post.linkedinAccountId);
        } else {
          linkedinAccount = await LinkedInAccount.findOne({ 
            userId: post.userId, 
            isDefault: true, 
            isActive: true 
          });
          
          if (!linkedinAccount) {
            linkedinAccount = await LinkedInAccount.findOne({ 
              userId: post.userId, 
              isActive: true 
            });
          }
        }

        // If no LinkedInAccount found, try legacy user fields
        if (!linkedinAccount && user.linkedinAccessToken) {
          console.log('Using legacy LinkedIn credentials from User model');
          linkedinAccount = {
            linkedinAccessToken: user.linkedinAccessToken,
            linkedinMemberUrn: user.linkedinMemberUrn,
            linkedinName: user.linkedinName,
            linkedinId: user.linkedinId
          };
        }

        if (!linkedinAccount || !linkedinAccount.linkedinAccessToken) {
          console.log(`No LinkedIn account found for user ${user.clerkId}`);
          await Post.findByIdAndUpdate(post._id, {
            status: 'failed',
            errorMessage: 'LinkedIn account not found or not connected'
          });
          continue;
        }

        console.log(`Posting to LinkedIn account: ${linkedinAccount.linkedinName || linkedinAccount.linkedinId}`);
        console.log(`LinkedIn Member URN: ${linkedinAccount.linkedinMemberUrn}`);
        console.log(`Access Token exists: ${!!linkedinAccount.linkedinAccessToken}`);
        
        // Ensure we have the member URN
        let memberUrn = linkedinAccount.linkedinMemberUrn;
        if (!memberUrn) {
          console.log(`Missing LinkedIn member URN, attempting to refresh...`);
          memberUrn = await refreshLinkedInMemberUrn(linkedinAccount);
          
          if (!memberUrn) {
            await Post.findByIdAndUpdate(post._id, {
              status: 'failed',
              errorMessage: 'LinkedIn member URN not found. Please reconnect LinkedIn account.'
            });
            continue;
          }
        }
        
        // Handle image upload if post has image
        let assetUrn = null;
        if (post.hasImage && post.imageUrl) {
          console.log('🖼️ Post has image, uploading to LinkedIn...');
          const imagePath = path.join(__dirname, '..', post.imageUrl.replace('/uploads/', 'uploads/'));
          console.log('Image path:', imagePath);
          
          if (fs.existsSync(imagePath)) {
            const stats = fs.statSync(imagePath);
            console.log('Image size:', stats.size, 'bytes');
            
            assetUrn = await uploadImageToLinkedIn(imagePath, linkedinAccount.linkedinAccessToken, memberUrn);
            if (!assetUrn) {
              throw new Error('Failed to upload image to LinkedIn');
            }
          } else {
            console.log('❌ Image file not found:', imagePath);
            throw new Error('Image file not found');
          }
        }

        // Create LinkedIn post
        const postData = {
          author: memberUrn,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text: post.content
              },
              shareMediaCategory: assetUrn ? 'IMAGE' : 'NONE'
            }
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
          }
        };

        // Add media if image was uploaded
        if (assetUrn) {
          postData.specificContent['com.linkedin.ugc.ShareContent'].media = [
            {
              status: 'READY',
              description: { text: 'Generated image for LinkedIn post' },
              media: assetUrn,
              title: { text: 'Post Image' }
            }
          ];
        }

        console.log('Post data:', JSON.stringify(postData, null, 2));
        
        const response = await axios.post('https://api.linkedin.com/v2/ugcPosts', postData, {
          headers: {
            'Authorization': `Bearer ${linkedinAccount.linkedinAccessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          }
        });

        console.log(`✅ Successfully posted to LinkedIn: ${response.data.id}`);
        console.log('Post type:', assetUrn ? 'Text + Image' : 'Text only');
        
        await Post.findByIdAndUpdate(post._id, {
          status: 'posted',
          postedAt: new Date(),
          linkedinPostId: response.data.id
        });

      } catch (error) {
        console.error(`❌ Failed to post to LinkedIn ${post._id}:`);
        console.error('Error message:', error.message);
        console.error('Error status:', error.response?.status);
        console.error('Error data:', JSON.stringify(error.response?.data, null, 2));
        console.error('Full error:', error);
        
        let errorMessage = error.message;
        
        // Handle specific LinkedIn API errors
        if (error.response?.data) {
          errorMessage = `LinkedIn API Error: ${JSON.stringify(error.response.data)}`;
        }
        
        if (error.response?.status === 403) {
          errorMessage = 'LinkedIn access denied. Please reconnect your LinkedIn account.';
          await User.findOneAndUpdate(
            { clerkId: post.userId },
            { isLinkedinConnected: false, linkedinMemberUrn: null }
          );
        } else if (error.response?.status === 401) {
          errorMessage = 'LinkedIn token expired. Please reconnect your LinkedIn account.';
          await User.findOneAndUpdate(
            { clerkId: post.userId },
            { isLinkedinConnected: false, linkedinMemberUrn: null }
          );
        } else if (error.response?.status === 422) {
          errorMessage = 'LinkedIn posting failed - invalid author URN. Please reconnect LinkedIn account.';
          await User.findOneAndUpdate(
            { clerkId: post.userId },
            { linkedinMemberUrn: null }
          );
        }
        
        await Post.findByIdAndUpdate(post._id, {
          status: 'failed',
          errorMessage: errorMessage
        });
      }
    }
  } catch (error) {
    console.error('LinkedIn post scheduler error:', error);
  }
}

module.exports = { checkAndPostScheduledPosts };