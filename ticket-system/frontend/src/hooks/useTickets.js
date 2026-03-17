import { useState, useEffect, useCallback, useRef } from "react";
import { ticketAPI } from "../services/api";
import { getSocket } from "../services/socket";

export const useTickets = (initialParams = {}) => {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [params, setParams] = useState(initialParams);
  const mountedRef = useRef(true);

  const fetchTickets = useCallback(async (overrideParams) => {
    setLoading(true);
    setError(null);
    try {
      const p = overrideParams || params;
      const { data } = await ticketAPI.getAll(p);
      if (mountedRef.current) {
        setTickets(data.tickets);
        setPagination({ page: data.page, pages: data.pages, total: data.total });
      }
    } catch (err) {
      if (mountedRef.current) setError(err.response?.data?.message || "Failed to load tickets.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [params]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await ticketAPI.getStats();
      if (mountedRef.current) setStats(data.stats);
    } catch (_) {}
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchTickets();
    fetchStats();
    return () => { mountedRef.current = false; };
  }, [fetchTickets, fetchStats]);

  // Real-time socket updates
  useEffect(() => {
    const socket = getSocket();

    const handleCreated = ({ ticket }) => {
      setTickets((prev) => [ticket, ...prev]);
      fetchStats();
    };
    const handleUpdated = ({ ticket }) => {
      setTickets((prev) => prev.map((t) => t._id === ticket._id ? ticket : t));
      fetchStats();
    };
    const handleDeleted = ({ ticketId }) => {
      setTickets((prev) => prev.filter((t) => t._id !== ticketId));
      fetchStats();
    };
    const handleComment = ({ ticket }) => {
      setTickets((prev) => prev.map((t) => t._id === ticket._id ? ticket : t));
    };

    socket.on("ticketCreated", handleCreated);
    socket.on("ticketUpdated", handleUpdated);
    socket.on("ticketDeleted", handleDeleted);
    socket.on("commentAdded", handleComment);

    return () => {
      socket.off("ticketCreated", handleCreated);
      socket.off("ticketUpdated", handleUpdated);
      socket.off("ticketDeleted", handleDeleted);
      socket.off("commentAdded", handleComment);
    };
  }, [fetchStats]);

  const updateParams = useCallback((newParams) => {
    setParams((prev) => ({ ...prev, ...newParams }));
  }, []);

  return { tickets, stats, loading, error, pagination, params, fetchTickets, fetchStats, updateParams, setTickets };
};
