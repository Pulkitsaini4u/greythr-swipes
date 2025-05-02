fetchData(null);

function fetchData(userId) {
  chrome.runtime.sendMessage({
    action: 'fetchSwipes',
    userId: userId
  }, (response) => {
    if (response && response.success) {
      const swipePairs = response.data.swipePairs;
      const swipes = response.data.swipe;
      const tbody = document.getElementById('swipeData');
      const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;
      let totalMilliseconds = 0;
      let lastSwipeTime  = null;
      swipePairs.forEach(pair => {
        const inSwipe = swipes.find(s => s.punchDateTime === pair.inSwipe);
        const outSwipe = swipes.find(s => s.punchDateTime === pair.outSwipe);

        // IN row
        const inRow = document.createElement('tr');
        inRow.innerHTML = `
          <td class="swipe-type">IN</td>
          <td>${formatDateTime(pair.inSwipe)}</td>
          <td>${inSwipe?.doorName || '-'}</td>
        `;
        tbody.appendChild(inRow);

        // OUT row
        const outRow = document.createElement('tr');
        outRow.innerHTML = `
          <td class="swipe-type">OUT</td>
          <td>${formatDateTime(pair.outSwipe)}</td>
          <td>${outSwipe?.doorName || '-'}</td>
        `;
        tbody.appendChild(outRow);

        // Actual hours row
        const durationRow = document.createElement('tr');
        durationRow.innerHTML = `
          <td class="actual-hours" colspan="4">
            Actual Hours: ${formatActualHours(pair.actualHours)}
          </td>
        `;
        tbody.appendChild(durationRow);
        totalMilliseconds += pair.actualHours;

        const inTime = inSwipe?.punchDateTime || pair.inSwipe;
        const outTime = outSwipe?.punchDateTime || pair.outSwipe;
      
        // Update last swipe time to the latest of the two
        if (outTime && (!lastSwipeTime || new Date(outTime) > new Date(lastSwipeTime))) {
          lastSwipeTime = outTime;
        } else if (inTime && (!lastSwipeTime || new Date(inTime) > new Date(lastSwipeTime))) {
          lastSwipeTime = inTime;
        }
      });
      
      const estimateEl = document.getElementById('eightHourEstimate');
      if (totalMilliseconds < EIGHT_HOURS_MS && lastSwipeTime) {
        lastSwipeTime = new Date(new Date(lastSwipeTime).getTime() + 5.5 * 60 * 60 * 1000).getTime();
        estimateEl.textContent = `8 hours completed at: ${calculateCompletionTime(lastSwipeTime, totalMilliseconds*1000, 8)}`;
      } else {
        estimateEl.textContent = `8 hours already completed.`;
      }
      document.getElementById('totalTimeDisplay').textContent = `Total Time Spent: ${formatActualHours(totalMilliseconds)}`;

    } else {
      if (response && !response.isUserId) {
        document.getElementById('userIdForm').style.display = 'block'; // Show the form
        document.getElementById('submitUserId').addEventListener('click', () => {
          const userIdInput = document.getElementById('userIdInput').value;
          if (userIdInput) {
            fetchData(userIdInput);
            document.getElementById('userIdForm').style.display = 'none'; // Hide the form after submission
          }

        });
      }
      document.getElementById("swipeData").innerHTML = `<tr><td colspan="4">Error fetching data.</td></tr>`;
    }
  });
}

function formatDateTime(dateStr) {
  const utcDate = new Date(dateStr);
  const istOffset = 5.5 * 60; // IST is UTC+5:30
  const istTime = new Date(utcDate.getTime() + istOffset * 60000);

  const time = istTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  return `${time}`;
}

function formatActualHours(actualSeconds) {
  const totalMinutes = Math.floor(actualSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')} hrs ${String(minutes).padStart(2, '0')} mins`;
}


function calculateCompletionTime(currentTimeMs, hoursWorkedMs, workdayHours) {
  const workdayMs = workdayHours * 60 * 60 * 1000;
  const remainingMs = workdayMs - hoursWorkedMs;

  if (remainingMs <= 0) return "Already completed!";

  const completionTime = new Date(currentTimeMs + remainingMs);
  const hours = String(completionTime.getHours()).padStart(2, '0');
  const minutes = String(completionTime.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}
