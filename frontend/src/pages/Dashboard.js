import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getStreams } from '../services/api';
import StreamCard from '../components/StreamCard';
import { toast } from 'react-toastify';

const Dashboard = () => {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'active', 'inactive'
  const [platformFilter, setPlatformFilter] = useState('all'); // 'all', 'youtube', 'tiktok', 'shopee'

  const fetchStreams = async () => {
    try {
      setLoading(true);
      const data = await getStreams();
      setStreams(data);
    } catch (error) {
      toast.error('Failed to fetch streams');
      console.error('Fetch streams error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStreams();
  }, []);

  // Filter streams based on status and platform
  const filteredStreams = streams.filter(stream => {
    const statusMatch = activeFilter === 'all' || stream.status === activeFilter;
    const platformMatch = platformFilter === 'all' || stream.platform === platformFilter;
    return statusMatch && platformMatch;
  });

  return (
    <div className="dashboard">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className="fas fa-video me-2"></i>
          My Streams
        </h2>
        <Link to="/add-stream" className="btn btn-primary">
          <i className="fas fa-plus-circle me-2"></i>
          Add New Stream
        </Link>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <div className="mb-3 mb-md-0">
                <label className="form-label d-block">Status Filter</label>
                <div className="btn-group" role="group">
                  <button 
                    type="button" 
                    className={`btn ${activeFilter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setActiveFilter('all')}
                  >
                    All
                  </button>
                  <button 
                    type="button" 
                    className={`btn ${activeFilter === 'active' ? 'btn-success' : 'btn-outline-success'}`}
                    onClick={() => setActiveFilter('active')}
                  >
                    Active
                  </button>
                  <button 
                    type="button" 
                    className={`btn ${activeFilter === 'inactive' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                    onClick={() => setActiveFilter('inactive')}
                  >
                    Inactive
                  </button>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div>
                <label className="form-label d-block">Platform Filter</label>
                <div className="btn-group" role="group">
                  <button 
                    type="button" 
                    className={`btn ${platformFilter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setPlatformFilter('all')}
                  >
                    All
                  </button>
                  <button 
                    type="button" 
                    className={`btn ${platformFilter === 'youtube' ? 'btn-danger' : 'btn-outline-danger'}`}
                    onClick={() => setPlatformFilter('youtube')}
                  >
                    YouTube
                  </button>
                  <button 
                    type="button" 
                    className={`btn ${platformFilter === 'tiktok' ? 'btn-dark' : 'btn-outline-dark'}`}
                    onClick={() => setPlatformFilter('tiktok')}
                  >
                    TikTok
                  </button>
                  <button 
                    type="button" 
                    className={`btn ${platformFilter === 'shopee' ? 'btn-warning' : 'btn-outline-warning'}`}
                    onClick={() => setPlatformFilter('shopee')}
                  >
                    Shopee
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading your streams...</p>
        </div>
      ) : filteredStreams.length === 0 ? (
        <div className="card p-5 text-center">
          <div className="card-body">
            <i className="fas fa-stream fa-3x text-muted mb-3"></i>
            <h3>No Streams Found</h3>
            <p className="text-muted">
              {streams.length === 0 
                ? "You haven't added any streams yet." 
                : "No streams match your current filters."}
            </p>
            {streams.length === 0 && (
              <Link to="/add-stream" className="btn btn-primary mt-3">
                <i className="fas fa-plus-circle me-2"></i>
                Add Your First Stream
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="row">
          {filteredStreams.map(stream => (
            <div key={stream.id} className="col-md-6 col-lg-4 mb-4">
              <StreamCard stream={stream} refreshStreams={fetchStreams} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard; 