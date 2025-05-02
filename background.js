chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchSwipes') {
        try {
          chrome.storage.local.get('userId', async (result) => {
            if (result.userId || request.userId) {
              let userId = result.userId || request.userId;
              chrome.storage.local.set({ userId: userId }, () => {
                console.log('User ID stored in chrome.storage.local:', userId);
              });
              const cookies = await new Promise((resolve) => {
                chrome.cookies.getAll({
                  domain: 'greythr.com'
                }, resolve);
              });

              const cookieMap = {};
              cookies.forEach(cookie => {
                cookieMap[cookie.name] = cookie.value;
              });

              const headers = {
                'accept': 'application/json',
                'referer': 'https://bridging-healthcare.greythr.com/v3/portal/ess/attendance/attendance-info',
                'user-agent': navigator.userAgent,
                'x-requested-with': 'XMLHttpRequest',
                'csrf-token': cookieMap['csrf-token'] || '',
                'cookie': Object.entries(cookieMap).map(([k, v]) => `${k}=${v}`).join('; ')
              };

              const today = new Date();
              const yyyy = today.getFullYear();
              const mm = String(today.getMonth() + 1).padStart(2, '0'); // Months start at 0
              const dd = String(today.getDate()).padStart(2, '0');
              const formattedDate = `${yyyy}-${mm}-${dd}`;

              const response = await fetch(
                `https://bridging-healthcare.greythr.com/latte/v3/attendance/info/${userId}/swipes?startDate=${formattedDate}&endDate=&systemSwipes=true&swipePairs=true`, {
                  method: 'GET',
                  headers,
                  credentials: 'include'
                }
              );

              if (!response.ok) {
                if (response.status === 403) {
                  chrome.windows.create({
                    url: "https://bridging-healthcare.greythr.com/",
                    type: "popup",
                    focused: true
                  });
                  return;
                }
                throw new Error(`HTTP error: ${response.status}`);
              }

              const data = await response.json();
              sendResponse({
                success: true,
                data
              });
            } else {
              sendResponse({
                success: false,
                isUserId: false,
                error: 'User ID not found.'
              });
            }

          })
        } catch (err) {
          console.error('Background fetch error:', err);
          sendResponse({
            success: false,
            error: err.message
          });
        }
  
      return true; // 👈 This is **critical** to keep sendResponse alive
    }
  });
  