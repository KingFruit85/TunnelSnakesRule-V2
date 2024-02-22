export interface ClubProps {
    clubName: string;
    clubId: string;
}

export default function Club({ clubName, clubId }: ClubProps) {
    return (
        <div>
            <p>{clubName}</p>
            <button> go to club page </button>
        </div>
    );
}