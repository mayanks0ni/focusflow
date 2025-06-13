import { useEffect, useState } from 'react';
import './App.css';
import ReactMarkdown from 'react-markdown';

function App() {
  const [studyTopic, setStudyTopic] = useState('');
  const [resources, setResources] = useState('');
  const [duration, setDuration] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState(null);
  const [suggestion, setSuggestion] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  useEffect(() => {
    // Fetch feedback status once component mounts
    fetch('http://localhost:3000/feedback')
      .then((res) => res.json())
      .then((data) => {
        setFeedbackStatus(data.message);
        if (data.suggestion) setSuggestion(data.suggestion);
      })
      .catch((err) => {
        console.error('Error fetching feedback status:', err);
      });
  }, []);

  const handleStudySubmit = async (e) => {
    e.preventDefault();
    const data = {
      studyTopic,
      resources: resources || null,
      duration: duration || null,
    };
    try {
      const res = await fetch('http://localhost:3000/submit', {
        method: 'POST',
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });
      const d = await res.json();
      alert(d.message);
      setStudyTopic('');
      setResources('');
      setDuration('');
    } catch (err) {
      alert('Submission failed: ' + err.message);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    console.log("Feedback submitted:", feedback);
    setFeedbackSubmitted(true);
    setFeedback('');
    const res = await fetch("http://localhost:3000/submitFeedback", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fb: feedback })
    });
  };

  fetch("http://localhost:3000/fb", {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  }).then(res => res.json())
    .then(data => {
      setSuggestion(data.message);
    })

  if (feedbackStatus === 'yes') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center bg-gray-50 bg-gradient-to-r from-blue-300 to-blue-400">
        <h2 className="text-2xl font-semibold text-gray-800">
          You have already submitted the feedback for today.
        </h2>
        <p className="mt-2 text-gray-600">Please come back tomorrow.</p>
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <p className="font-semibold text-gray-700">FocusFlow's suggestion for improving:</p>
          <div className='text-left'>
             <ReactMarkdown>{suggestion || 'Loading suggestion from AI...'}</ReactMarkdown><p ></p>
          </div>
         
        </div>
      </div>
    );
  }

  if (feedbackStatus === 'no') {
    return (
      <div className='bg-gradient-to-r from-blue-300 to-blue-400'>
        <div className="max-w-xl mx-auto px-4 py-10 font-sans">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Submit Feedback</h2>

          {feedbackSubmitted ? (
            <p className="text-green-600 font-medium">✅ Thank you! Your feedback has been submitted.</p>
          ) : (
            <form onSubmit={handleFeedbackSubmit}>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Write your feedback here..."
                rows={5}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Submit
              </button>
            </form>
          )}
        </div>
      </div>

    );
  }

  if (feedbackStatus === 'noP') {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6 bg-gradient-to-r from-blue-300 to-blue-400">
        <h1 className="text-5xl font-extrabold text-blue-700 mb-10 tracking-tight">FocusFlow</h1>
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-xl">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Create Study Plan</h2>
          <form onSubmit={handleStudySubmit} className="space-y-5">
            <div>
              <label className="block text-gray-700 font-medium mb-1">What are you going to study?</label>
              <input
                type="text"
                value={studyTopic}
                onChange={(e) => setStudyTopic(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Calculus Chapter 3"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">From which resources? <span className="text-gray-500 text-sm">(optional)</span></label>
              <input
                type="text"
                value={resources}
                onChange={(e) => setResources(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Khan Academy, Textbook"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">How much duration do you require? <span className="text-gray-500 text-sm">(optional)</span></label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 2 hours"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition duration-200"
            >
              Submit Study Plan
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-screen text-gray-500">
      Loading...
    </div>
  );
}

export default App;
