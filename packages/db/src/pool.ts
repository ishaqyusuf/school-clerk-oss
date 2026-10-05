import { Pool, type PoolClient } from "pg";
import { logPerformance } from "@school-clerk/utils/server-performance";

type ConnectCallback = (
	error: Error | undefined,
	client: PoolClient | undefined,
	release: (error?: Error | boolean) => void,
) => void;

export class InstrumentedPool extends Pool {
	connect(): Promise<PoolClient>;
	connect(callback: ConnectCallback): void;
	connect(callback?: ConnectCallback): Promise<PoolClient> | undefined {
		const startedAt = performance.now();
		const record = () =>
			logPerformance("db.pool.acquire", startedAt, {
				poolTotal: this.totalCount,
				poolIdle: this.idleCount,
				poolWaiting: this.waitingCount,
			});
		if (callback) {
			super.connect((error, client, release) => {
				record();
				callback(error, client, release);
			});
			return;
		}
		return super.connect().finally(record);
	}
}
