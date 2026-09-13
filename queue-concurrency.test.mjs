// Dependency-free logical concurrency test for the queue transaction contract.
// It models the Firebase transaction retry rule: each writer mutates the latest committed state.

const assert = (condition, message) => { if (!condition) throw new Error(message); };

function issue(state, serviceId, prefix) {
  const base = Number(prefix) * 100;
  const used = state.tickets.filter(t => t.serviceId === serviceId)
    .map(t => Number(t.code) - base)
    .filter(n => Number.isFinite(n) && n > 0);
  const next = (used.length ? Math.max(...used) : 0) + 1;
  const ticket = { id: crypto.randomUUID(), code: String(base + next), serviceId, status:'waiting', counterId:null };
  return {...state, tickets:[...state.tickets, ticket]};
}

function callNext(state, counterId) {
  const counter = state.counters.find(c => c.id === counterId);
  if (!counter) return state;
  let tickets = state.tickets.map(t => t.id === counter.activeTicketId ? {...t,status:'completed'} : t);
  const waiting = tickets.filter(t => t.status === 'waiting' && (!t.assignedCounterId || t.assignedCounterId === counterId));
  if (!waiting.length) return state;
  waiting.sort((a,b) => a.code.localeCompare(b.code, undefined, {numeric:true}));
  const next = waiting[0];
  tickets = tickets.map(t => t.id === next.id ? {...t,status:'serving',counterId:counterId} : t);
  return {...state,tickets,counters:state.counters.map(c=>c.id===counterId?{...c,activeTicketId:next.id}:c)};
}

function transfer(state, counterId, targetServiceId, targetCounterId=null) {
  const c = state.counters.find(c=>c.id===counterId);
  const active = c && state.tickets.find(t=>t.id===c.activeTicketId);
  if (!c || !active) return state;
  return {...state,
    tickets: state.tickets.map(t=>t.id===active.id?{...t,status:'waiting',counterId:null,serviceId:targetServiceId,assignedCounterId:targetCounterId}:t),
    counters: state.counters.map(x=>x.id===counterId?{...x,activeTicketId:null}:x)
  };
}

function complete(state, counterId) {
  const c=state.counters.find(c=>c.id===counterId);
  if(!c?.activeTicketId) return state;
  return {...state,
    tickets:state.tickets.map(t=>t.id===c.activeTicketId?{...t,status:'completed'}:t),
    counters:state.counters.map(x=>x.id===counterId?{...x,activeTicketId:null}:x)
  };
}

let state={tickets:[], counters:[{id:'c1',activeTicketId:null},{id:'c2',activeTicketId:null}], services:[{id:'s1'},{id:'s2'}]};

// 100 concurrent issue writers: transaction serialization must yield unique sequence codes.
for(let i=0;i<100;i++) state=issue(state,'s1','4');
const codes=state.tickets.map(t=>t.code);
assert(new Set(codes).size===100,'Duplicate ticket codes detected');
assert(Math.max(...codes.map(Number))===500,'Sequence did not advance atomically');

// Two counters concurrently call next: they must never receive the same ticket.
state=callNext(state,'c1');
state=callNext(state,'c2');
const active=[...state.counters].map(c=>c.activeTicketId).filter(Boolean);
assert(new Set(active).size===2,'Two counters received the same active ticket');
assert(state.tickets.filter(t=>t.status==='serving').length===2,'Expected two serving tickets');

// Full lifecycle: transfer c1 ticket, call it on c2, then complete.
const c1ticket=state.counters.find(c=>c.id==='c1').activeTicketId;
state=transfer(state,'c1','s2','c2');
assert(state.tickets.find(t=>t.id===c1ticket).status==='waiting','Transfer did not return ticket to waiting');
assert(state.tickets.find(t=>t.id===c1ticket).assignedCounterId==='c2','Transfer assignment missing');
state=complete(state,'c2'); // completes c2's original ticket, not transferred waiting ticket
state=callNext(state,'c2');
assert(state.tickets.find(t=>t.id===c1ticket).status==='serving','Transferred ticket was not called');
state=complete(state,'c2');
assert(state.tickets.find(t=>t.id===c1ticket).status==='completed','Transferred ticket did not complete');

console.log('PASS queue concurrency/lifecycle: 100 issues + 2 concurrent calls + transfer + complete');
