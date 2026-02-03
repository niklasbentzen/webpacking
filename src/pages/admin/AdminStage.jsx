import React from "react";
import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";

import { fetchStageByIdWithActivities } from "../../lib/stages";
import UploadGpx from "../../components/UploadGpx/UploadGpx";

export default function AdminStage() {
  const { stageId } = useParams();
  const [stage, setStage] = React.useState(null);
  const [activities, setActivities] = React.useState([]);

  useEffect(() => {
    async function loadStage() {
      const stageRes = await fetchStageByIdWithActivities(stageId);
      setStage(stageRes);
      setActivities(stageRes.expand["activities_via_stage"] || []);
    }
    loadStage();
  }, []);

  console.log({ stage, activities });

  return (
    <div>
      <Link to={`/admin/trips/${stage?.trip}`}>
        <div>Return</div>
      </Link>
      <h1>Admin Stage Page</h1>
      <p>This is the admin interface for managing a specific stage.</p>

      {stage && <UploadGpx stageId={stage.id} />}

      {activities.map((activity) => (
        <div
          key={activity.id}
          style={{ border: "1px solid #ccc", margin: "1em 0", padding: "1em" }}
        >
          <p>Type: {activity.type}</p>
          <p>Start Time: {activity.startTime}</p>
          <p>End Time: {activity.endTime}</p>
        </div>
      ))}
    </div>
  );
}
