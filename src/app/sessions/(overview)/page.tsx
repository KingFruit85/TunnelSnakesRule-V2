import { getAllActiveSessions, getAllInactiveSessions } from "@/app/lib/data";
import CurrentSession from "@/app/ui/sessions/currentSession/currentSession";
import PreviousSessions from "@/app/ui/sessions/previousSessions";

export default async function Page() {
  const activeSessions = await getAllActiveSessions();
  const previousSessions = await getAllInactiveSessions();

  return (
    <div className="flex flex-col gap-2 items-center  h-screen">
      <div className="text-2xl md:text-3xl lg:text-3xl xl:text-3xl text-center font-montserrat mt-4 mb-2">
        Active Sessions
      </div>
      {activeSessions.map((session) => (
        <div key={session.id}>
          <CurrentSession session={session} />
        </div>
      ))}
      <PreviousSessions sessions={previousSessions} />
    </div>
  );
}

// <Stack
//   direction="column"
//   divider={<Divider orientation="vertical" flexItem />}
//   spacing={2}
//   alignItems={"center"} // this seems to fuck things up
// >
//   <div>Active Sessions</div>
//   <div>
//   <div className="">

//     </div>
//   </div>
//   <div>
//     <PreviousSessions sessions={previousSessions} />
//   </div>
// </Stack>

// <Box sx={{ flexGrow: 1 }} className="bg-black">

//   <Box sx={{ flexGrow: 1 }} className="bg-black" >
//   <Grid
//     container
//     alignContent={"center"}
//     alignItems={"center"}
//     justifyContent={"center"}
//     spacing={{ xs: 2, md: 3 }}
//     columns={{ xs: 4, sm: 8, md: 12 }}
//   >
//     <Grid xs={12}>

//     </Grid>
//     <Grid xs={12}>
//       <div>
//         {activeSessions.map((session) => (
//           <div key={session.id}>
//             <CurrentSession session={session} />
//           </div>
//         ))}
//       </div>
//     </Grid>
//     <Grid xs={6}>
//       <div>
//         <PreviousSessions sessions={previousSessions} />
//       </div>
//     </Grid>
//   </Grid>
// </Box>
{
  /* <div className="flex-col space-items items-center m-10">
  

  

</div > */
}
