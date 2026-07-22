import { getAllAcessRequests } from "../lib/data";
import ClubAccessRequests from "../ui/requests/clubAccessRequests";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const { userid: playerId, clubid: clubId } = await searchParams;

  // get all the requests for the club

  const requests = await getAllAcessRequests(clubId);


  return (
    <div className="flex-col border border-tunnel-snake-white bg-black ml-2 mr-2 mt-2">
        <ClubAccessRequests players={requests} clubId={clubId} />
    </div>
  );
}
